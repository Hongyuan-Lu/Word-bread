import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";
import {
  annotateTokens,
  verifyTokenization,
  type WordInfo,
  type AnnotatedToken,
} from "../src/lib/vocab/annotateArticle";
import { extractWordTokens } from "../src/lib/vocab/tokenize";
import type { TargetExam, ExamLevel } from "../src/types/vocab";
import type { TokenType } from "../src/types/article";

const BATCH_SIZE = 1000;

interface Article {
  id: string;
  candidate_id: string;
  cet4_body_en: string | null;
  cet6_body_en: string | null;
  token_status: string | null;
}

interface ArticleToken {
  article_id: string;
  target_exam: TargetExam;
  token_index: number;
  sentence_index: number;
  surface: string;
  token_type: TokenType;
  lemma: string | null;
  word_id: string | null;
  short_explanation: string | null;
}

async function fetchUntokenizedArticles(): Promise<Article[]> {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("id, candidate_id, cet4_body_en, cet6_body_en, token_status")
    .not("cet4_body_en", "is", null);

  if (error) {
    console.error("Error fetching articles:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  const articlesWithStatus = data as Article[];
  if (articlesWithStatus[0].token_status !== undefined) {
    return articlesWithStatus.filter(
      (a) =>
        !a.token_status ||
        a.token_status === "pending" ||
        a.token_status === "failed"
    );
  }

  const articlesWithoutStatus = await Promise.all(
    articlesWithStatus.map(async (article) => {
      const { data: tokens, error: tokenError } = await supabaseAdmin
        .from("article_tokens")
        .select("id")
        .eq("article_id", article.id)
        .eq("target_exam", "CET4")
        .limit(1);

      if (tokenError && tokenError.code !== "42P01") {
        console.warn(
          `Warning: ${article.id} token check error:`,
          tokenError.message
        );
      }

      return { article, hasTokens: tokens && tokens.length > 0 };
    })
  );

  const untokenized = articlesWithoutStatus
    .filter((item) => !item.hasTokens)
    .map((item) => item.article);

  return untokenized;
}

async function updateArticleStatus(
  articleId: string,
  status: "pending" | "in_progress" | "completed" | "failed"
): Promise<void> {
  const updates: Record<string, unknown> = {
    token_status: status,
  };

  const { error } = await supabaseAdmin
    .from("articles")
    .update(updates)
    .eq("id", articleId);

  if (error && error.code !== "42703") {
    console.error(`Error updating article ${articleId} status:`, error);
  }
}

async function fetchAllWordInfo(): Promise<Map<string, WordInfo>> {
  console.log("Fetching all word info from words table...");

  const wordInfoMap = new Map<string, WordInfo>();
  let from = 0;
  const step = BATCH_SIZE;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("words")
      .select("id, lemma, exam_level, pos, cn_gloss")
      .range(from, from + step - 1);

    if (error) {
      console.error(`Error fetching words (from ${from}):`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const word of data) {
      wordInfoMap.set(word.lemma, {
        id: word.id,
        lemma: word.lemma,
        pos: word.pos || null,
        exam_level: word.exam_level as ExamLevel,
        cn_gloss: word.cn_gloss || null,
      });
    }

    if (data.length < step) {
      break;
    }

    from += step;
  }

  console.log(`Fetched ${wordInfoMap.size} word entries`);
  return wordInfoMap;
}

async function deleteExistingTokens(
  articleId: string,
  targetExam: TargetExam
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("article_tokens")
    .delete()
    .eq("article_id", articleId)
    .eq("target_exam", targetExam);

  if (error) {
    console.error(
      `Error deleting existing tokens for ${articleId}/${targetExam}:`,
      error
    );
    throw error;
  }
}

function convertToDbTokens(
  articleId: string,
  targetExam: TargetExam,
  annotatedTokens: AnnotatedToken[]
): ArticleToken[] {
  return annotatedTokens.map((token) => ({
    article_id: articleId,
    target_exam: targetExam,
    token_index: token.token_index,
    sentence_index: token.sentence_index,
    surface: token.surface,
    token_type: token.token_type,
    lemma: token.lemma,
    word_id: token.word_id,
    short_explanation: token.short_explanation,
  }));
}

async function insertTokens(tokens: ArticleToken[]): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.from("article_tokens").insert(tokens);

  if (error) {
    console.error("Error inserting tokens:", error);
    throw error;
  }
}

async function tokenizeArticleBody(
  articleId: string,
  bodyText: string,
  targetExam: TargetExam,
  lemmaToWordInfo: Map<string, WordInfo>
): Promise<number> {
  console.log(`  Tokenizing ${targetExam} body (${bodyText.length} chars)...`);

  const annotatedTokens = annotateTokens(bodyText, {
    targetExam,
    lemmaToWordInfo,
  });

  const verification = verifyTokenization(bodyText, annotatedTokens);
  if (!verification.isValid) {
    console.warn(
      `  Warning: Tokenization verification failed for ${articleId}/${targetExam}: ${verification.reason}`
    );
  }

  const dbTokens = convertToDbTokens(articleId, targetExam, annotatedTokens);

  await deleteExistingTokens(articleId, targetExam);

  for (let i = 0; i < dbTokens.length; i += BATCH_SIZE) {
    const batch = dbTokens.slice(i, i + BATCH_SIZE);
    await insertTokens(batch);
  }

  console.log(
    `  Inserted ${dbTokens.length} tokens for ${articleId}/${targetExam}`
  );

  return dbTokens.length;
}

async function processArticle(
  article: Article,
  lemmaToWordInfo: Map<string, WordInfo>
): Promise<void> {
  console.log(`\nProcessing article: ${article.id}`);
  console.log(`  Candidate: ${article.candidate_id}`);

  try {
    await updateArticleStatus(article.id, "in_progress");

    let totalTokens = 0;

    if (article.cet4_body_en) {
      const cet4Tokens = await tokenizeArticleBody(
        article.id,
        article.cet4_body_en,
        "CET4",
        lemmaToWordInfo
      );
      totalTokens += cet4Tokens;
    }

    if (article.cet6_body_en) {
      const cet6Tokens = await tokenizeArticleBody(
        article.id,
        article.cet6_body_en,
        "CET6",
        lemmaToWordInfo
      );
      totalTokens += cet6Tokens;
    }

    await updateArticleStatus(article.id, "completed");

    console.log(`  Completed: ${totalTokens} total tokens`);
  } catch (error) {
    console.error(`  Error processing article ${article.id}:`, error);
    await updateArticleStatus(article.id, "failed");
    throw error;
  }
}

export async function main() {
  console.log("=".repeat(60));
  console.log("WordBread Article Tokenization Script");
  console.log("=".repeat(60));
  console.log();

  const lemmaToWordInfo = await fetchAllWordInfo();

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  while (true) {
    const articles = await fetchUntokenizedArticles();

    if (articles.length === 0) {
      console.log("\nNo more articles to process");
      break;
    }

    for (const article of articles) {
      if (!article.cet4_body_en && !article.cet6_body_en) {
        console.log(`\nSkipping article ${article.id}: no body content`);
        await updateArticleStatus(article.id, "completed");
        skipped++;
        continue;
      }

      try {
        await processArticle(article, lemmaToWordInfo);
        processed++;
      } catch (error) {
        console.error(`Failed to process article ${article.id}`);
        failed++;
      }
    }

    if (processed > 0 && articles.length === 0) {
      break;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
