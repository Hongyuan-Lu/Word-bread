import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";
import { minimaxLLM } from "../src/lib/ai/minimaxLangChainClient";
import { RewriteResultSchema } from "../src/types/database";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonFromResponse(content: string): unknown | null {
  let cleanContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");

  const codeBlockMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      return null;
    }
  }

  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  return null;
}

function buildRewriteSystemPrompt(): string {
  return `你是一个专业的英语学习内容创作助手，擅长将新闻改写成适合 CET4 和 CET6 学习者的阅读材料。

重要约束：
- 禁止在输出中包含任何思考过程、<thinking>标签或类似内容
- 只输出纯 JSON，不要有任何其他内容
- 不要输出 markdown 代码块标记

你的任务：
1. 将新闻标题翻译成中文（不要改写，只翻译）
2. 根据新闻内容改写成约 300 词的英语短文
3. 同时生成对应的自然中文翻译
4. 不编造任何新闻原文没有的事实
5. 不使用 HTML 标签
6. 不使用 markdown 格式
7. 输出必须是纯 JSON 格式

标题翻译要求：
- 只翻译，不改写
- 保持原意，通顺自然

CET4 版本要求：
- 句子较短，结构清晰
- 词汇尽量基础，避免复杂生词
- 适合 CET4 水平学习者阅读

CET6 版本要求：
- 表达更自然，允许适度复杂句
- 但仍保持清晰，不要写成原版外刊难度
- 适合 CET6 水平学习者阅读`;
}

function buildRewriteUserPrompt(candidate: {
  source_name: string;
  source_title: string;
  source_summary: string | null;
  source_body_text: string | null;
}): string {
  const title = candidate.source_title || "";
  const summary = candidate.source_summary || "";
  const bodyText = candidate.source_body_text || "";

  let contentSource = "";
  let instruction = "";

  if (candidate.source_name === "The Guardian") {
    if (bodyText && bodyText.length > 100) {
      contentSource = `标题：${title}\n\n摘要：${summary}\n\n正文：${bodyText}`;
      instruction = "你将基于上面的标题、摘要和正文进行改写。";
    } else {
      contentSource = `标题：${title}\n\n摘要：${summary}`;
      instruction = "你将基于上面的标题和摘要进行改写。由于没有提供正文，你需要基于已有信息扩写成学习短文，但不要编造标题和摘要之外的事实。";
    }
  } else {
    contentSource = `标题：${title}\n\n摘要：${summary}`;
    instruction = "你将基于上面的标题和摘要进行改写。由于没有提供正文，你需要基于已有信息扩写成学习短文，但不要编造标题和摘要之外的事实。";
  }

  return `${instruction}

重要：禁止在输出中包含<thinking>标签或任何思考过程，只输出纯JSON。

请严格按以下JSON格式输出（必须是有效JSON，不要有其他内容）：
{
  "title_zh": "中文标题...",
  "cet4_body_en": "CET4英文短文，约300词...",
  "cet4_body_zh": "CET4英文短文的中文翻译...",
  "cet6_body_en": "CET6英文短文，约300词...",
  "cet6_body_zh": "CET6英文短文的中文翻译..."
}

${contentSource}`;
}

async function rewriteArticle(candidate: {
  candidate_id: string;
  source_name: string;
  source_url: string | null;
  source_published_at: string | null;
  subject_category: string | null;
  source_title: string;
  source_summary: string | null;
  source_body_text: string | null;
}): Promise<{
  title_zh: string;
  cet4_body_en: string;
  cet4_body_zh: string;
  cet6_body_en: string;
  cet6_body_zh: string;
}> {
  const systemPrompt = buildRewriteSystemPrompt();
  const userPrompt = buildRewriteUserPrompt(candidate);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await minimaxLLM.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      let responseContent = "";
      if (typeof response === "string") {
        responseContent = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as { content?: string | Array<{ text?: string }> };
        if (typeof responseObj.content === "string") {
          responseContent = responseObj.content;
        } else if (Array.isArray(responseObj.content) && responseObj.content.length > 0) {
          responseContent = (responseObj.content[0] as { text?: string }).text || "";
        }
      }

      const parsed = extractJsonFromResponse(responseContent);
      if (!parsed) {
        console.error(`[${candidate.candidate_id}] 第 ${attempt} 次：无法解析JSON`);
        console.error("实际返回:", responseContent.slice(0, 500));
        if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
        continue;
      }

      const validated = RewriteResultSchema.safeParse(parsed);
      if (!validated.success) {
        console.error(`[${candidate.candidate_id}] 第 ${attempt} 次：Zod校验失败`);
        console.error("实际返回:", JSON.stringify(parsed, null, 2).slice(0, 500));
        if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
        continue;
      }

      return validated.data;
    } catch (error) {
      console.error(`[${candidate.candidate_id}] 第 ${attempt} 次：调用失败`);
      if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
    }
  }

  throw new Error(`Rewrite failed after ${MAX_RETRIES} retries for ${candidate.candidate_id}`);
}

export async function main() {
  const { data: selectedCandidates, error: selectError } = await supabaseAdmin
    .from("news_candidates")
    .select("candidate_id, source_name, source_url, source_published_at, subject_category, source_title, source_summary, source_body_text")
    .eq("is_selected", true)
    .not("subject_category", "is", null);

  if (selectError) {
    throw selectError;
  }

  if (!selectedCandidates || selectedCandidates.length === 0) {
    console.log("No selected candidates to rewrite");
    return;
  }

  const { data: existingArticles, error: existError } = await supabaseAdmin
    .from("articles")
    .select("candidate_id");

  if (existError) {
    throw existError;
  }

  const existingIds = new Set(existingArticles?.map((a) => a.candidate_id) || []);
  const candidates = selectedCandidates.filter((c) => !existingIds.has(c.candidate_id));

  if (candidates.length === 0) {
    console.log("All selected candidates have already been rewritten");
    return;
  }

  console.log(`Found ${candidates.length} candidates to rewrite (${selectedCandidates.length} selected, ${existingIds.size} already done)`);

  for (const candidate of candidates) {
    console.log(`Rewriting: ${candidate.source_title}`);

    const rewriteResult = await rewriteArticle(candidate);

    const { error: insertError } = await supabaseAdmin.from("articles").insert({
      candidate_id: candidate.candidate_id,
      source_url: candidate.source_url,
      source_name: candidate.source_name,
      source_published_at: candidate.source_published_at,
      subject_category: candidate.subject_category,
      title_en: candidate.source_title,
      title_zh: rewriteResult.title_zh,
      cet4_body_en: rewriteResult.cet4_body_en,
      cet4_body_zh: rewriteResult.cet4_body_zh,
      cet6_body_en: rewriteResult.cet6_body_en,
      cet6_body_zh: rewriteResult.cet6_body_zh,
    });

    if (insertError) {
      console.error(`Failed to insert article for ${candidate.candidate_id}:`, insertError);
    } else {
      console.log(`Successfully created article for ${candidate.candidate_id}`);
    }

    await delay(RETRY_DELAY_MS);
  }

  console.log("Rewrite complete");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}