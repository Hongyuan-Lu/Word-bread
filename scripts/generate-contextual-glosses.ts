import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";
import {
  buildGlossBatchInput,
  splitIntoBatches,
  type GlossBatchInput,
} from "../src/lib/rag/buildGlossBatchInput";
import { generateContextualGlossBatch } from "../src/lib/rag/generateContextualGlossBatch";
import type { ArticleToken } from "../src/types/database";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Article {
  id: string;
  token_status: string | null;
}

interface ProcessResult {
  articleId: string;
  success: boolean;
  cet4Total: number;
  cet4Processed: number;
  cet6Total: number;
  cet6Processed: number;
  errors: string[];
}

async function fetchCompletedArticles(): Promise<Article[]> {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("id, token_status")
    .eq("token_status", "completed");

  if (error) {
    console.error("Error fetching articles:", error);
    throw error;
  }

  return (data as Article[]) || [];
}

async function fetchTokens(
  articleId: string,
  targetExam: "CET4" | "CET6"
): Promise<ArticleToken[]> {
  const { data, error } = await supabaseAdmin
    .from("article_tokens")
    .select("*")
    .eq("article_id", articleId)
    .eq("target_exam", targetExam)
    .order("token_index", { ascending: true });

  if (error) {
    console.error(`Error fetching tokens for ${articleId}/${targetExam}:`, error);
    throw error;
  }

  return (data as ArticleToken[]) || [];
}

async function updateTokenExplanation(
  tokenId: string,
  shortExplanation: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("article_tokens")
    .update({ short_explanation: shortExplanation })
    .eq("id", tokenId);

  if (error) {
    console.error(`Error updating token ${tokenId}:`, error);
  }
}

async function processArticle(articleId: string): Promise<ProcessResult> {
  const result: ProcessResult = {
    articleId,
    success: true,
    cet4Total: 0,
    cet4Processed: 0,
    cet6Total: 0,
    cet6Processed: 0,
    errors: [],
  };

  console.log(`\nProcessing article: ${articleId}`);

  for (const targetExam of ["CET4", "CET6"] as const) {
    const tokens = await fetchTokens(articleId, targetExam);

    if (tokens.length === 0) {
      console.log(`  [${targetExam}] No tokens found, skipping`);
      continue;
    }

    const batchInput = buildGlossBatchInput(articleId, targetExam, tokens);

    if (batchInput.target_tokens.length === 0) {
      console.log(`  [${targetExam}] No target tokens (word_id is null), skipping`);
      continue;
    }

    const totalTokens = batchInput.target_tokens.length;
    if (targetExam === "CET4") {
      result.cet4Total = totalTokens;
    } else {
      result.cet6Total = totalTokens;
    }

    console.log(`  [${targetExam}] Found ${totalTokens} target tokens`);

    const batches = splitIntoBatches(batchInput, 40);
    console.log(`  [${targetExam}] Split into ${batches.length} batch(es)`);

    let processedInExam = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        `  [${targetExam}] Processing batch ${i + 1}/${batches.length} (${batch.target_tokens.length} tokens)`
      );

      let batchResult = await generateContextualGlossBatch(batch);
      let attempt = 1;

      while (!batchResult.success && attempt < MAX_RETRIES) {
        console.log(`  [${targetExam}] Batch ${i + 1} failed, retry ${attempt + 1}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`);
        await delay(RETRY_DELAY_MS);
        batchResult = await generateContextualGlossBatch(batch);
        attempt++;
      }

      if (!batchResult.success) {
        const errMsg = `[${targetExam}] Batch ${i + 1} failed after ${MAX_RETRIES} retries: ${batchResult.error}`;
        console.error(`  ${errMsg}`);
        result.errors.push(errMsg);
        result.success = false;
        continue;
      }

      if (!batchResult.items || batchResult.items.length === 0) {
        const errMsg = `[${targetExam}] Batch ${i + 1} returned no items`;
        console.error(`  ${errMsg}`);
        result.errors.push(errMsg);
        result.success = false;
        continue;
      }

      const expectedCount = batch.target_tokens.length;
      let totalProcessed = batchResult.items.length;
      const processedTokenIds = new Set(batchResult.items.map((item) => item.token_id));

      console.log(`  [${targetExam}] Batch ${i + 1} initial returned ${totalProcessed} explanations (expected ${expectedCount})`);

      for (const item of batchResult.items) {
        await updateTokenExplanation(item.token_id, item.short_explanation);
      }

      if (totalProcessed < expectedCount) {
        console.log(`  [${targetExam}] Batch ${i + 1}: ${expectedCount - totalProcessed} tokens missing, retrying...`);
        
        let retryAttempt = 0;
        
        while (retryAttempt < MAX_RETRIES && totalProcessed < expectedCount) {
          await delay(RETRY_DELAY_MS);
          
          const retryResult = await generateContextualGlossBatch(batch);
          retryAttempt++;
          
          if (!retryResult.success) {
            console.log(`  [${targetExam}] Retry ${retryAttempt} failed: ${retryResult.error}`);
            continue;
          }
          
          if (!retryResult.items || retryResult.items.length === 0) {
            console.log(`  [${targetExam}] Retry ${retryAttempt} returned no items`);
            continue;
          }
          
          const newItems = retryResult.items.filter((item) => !processedTokenIds.has(item.token_id));
          
          if (newItems.length === 0) {
            console.log(`  [${targetExam}] Retry ${retryAttempt} returned only already-processed tokens`);
            continue;
          }
          
          console.log(`  [${targetExam}] Retry ${retryAttempt} returned ${retryResult.items.length} items (${newItems.length} new)`);
          
          for (const item of newItems) {
            await updateTokenExplanation(item.token_id, item.short_explanation);
            processedTokenIds.add(item.token_id);
            totalProcessed++;
          }
          
          console.log(`  [${targetExam}] Total processed: ${totalProcessed}/${expectedCount}`);
        }
        
        if (totalProcessed < expectedCount) {
          const errMsg = `[${targetExam}] Batch ${i + 1}: ${expectedCount - totalProcessed} tokens still missing after ${MAX_RETRIES} retries`;
          console.error(`  ⚠ ${errMsg}`);
          result.errors.push(errMsg);
          result.success = false;
        } else {
          console.log(`  [${targetExam}] Batch ${i + 1} completed: ${totalProcessed}/${expectedCount}`);
        }
      }

      processedInExam += totalProcessed;
    }

    if (targetExam === "CET4") {
      result.cet4Processed = processedInExam;
    } else {
      result.cet6Processed = processedInExam;
    }
  }

  return result;
}

export async function main(): Promise<void> {
  console.log("Starting contextual gloss generation...");
  console.log("=".repeat(60));

  const articles = await fetchCompletedArticles();
  console.log(`Found ${articles.length} completed articles\n`);

  if (articles.length === 0) {
    console.log("No articles with token_status='completed' found.");
    return;
  }

  const results: ProcessResult[] = [];

  for (const article of articles) {
    let articleResult = await processArticle(article.id);
    results.push(articleResult);

    if (articleResult.success) {
      const cet4Info = articleResult.cet4Total > 0 
        ? `CET4: ${articleResult.cet4Processed}/${articleResult.cet4Total}` 
        : "CET4: 0";
      const cet6Info = articleResult.cet6Total > 0 
        ? `CET6: ${articleResult.cet6Processed}/${articleResult.cet6Total}` 
        : "CET6: 0";
      console.log(`\n✓ SUCCESS: Article ${article.id} [${cet4Info}] [${cet6Info}]`);
    } else {
      console.log(`\n✗ FAILED: Article ${article.id}`);
      console.log(`  Errors: ${articleResult.errors.join("; ")}`);
    }

    console.log("-".repeat(60));
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  console.log(`Total articles: ${results.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log("\nFailed articles:");
    for (const r of results.filter((r) => !r.success)) {
      console.log(`  - ${r.articleId}: ${r.errors.join("; ")}`);
    }
    console.log("\nPlease re-run the script to retry failed articles.");
  } else {
    console.log("\n✓ All articles processed successfully!");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}