/**
 * WordBread 每日内容生成流水线
 * 
 * 执行顺序（北京时间 09:00 运行）：
 * 1. cleanup-old-data.ts   - 清理过期数据（先清后写，保证存储占用不超）
 * 2. fetch-news.ts         - 爬取昨日 UTC 新闻
 * 3. classify-news.ts      - AI 专业分类
 * 4. select-news.ts        - 按分类选择候选文章
 * 5. rewrite-news.ts       - AI 改写为 CET4/CET6 版本
 * 6. tokenize-articles.ts  - 结构化 token 生成
 * 7. generate-contextual-glosses.ts - 超纲词上下文释义
 * 
 * 使用方式：
 *   pnpm tsx scripts/daily-generate.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";

// ==================== 通用工具函数 ====================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TIME_ZONE = "UTC";

function getDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function getYesterdayUTC(): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return getDateInTimeZone(yesterday, TIME_ZONE);
}

// ==================== Step 1: 数据清理 ====================

async function cleanupOldData(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Step 1/7: 数据清理");
  console.log("=".repeat(60));

  // 删除 7 天前的 articles（级联删除 article_tokens）
  const articlesCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const articlesCutoffDate = getDateInTimeZone(articlesCutoff, TIME_ZONE);

  console.log(`删除 ${articlesCutoffDate} 之前的 articles...`);
  const { error: articlesError } = await supabaseAdmin
    .from("articles")
    .delete()
    .lt("source_published_at", articlesCutoffDate);

  if (articlesError) {
    console.error("  Error:", articlesError.message);
  } else {
    console.log("  ✓ 删除旧文章（含 article_tokens）");
  }

  // 删除 1 天前的 news_candidates
  const candidatesCutoff = getYesterdayUTC();
  console.log(`删除 ${candidatesCutoff} 之前的 news_candidates...`);
  const { error: candidatesError } = await supabaseAdmin
    .from("news_candidates")
    .delete()
    .lt("source_published_at", candidatesCutoff);

  if (candidatesError) {
    console.error("  Error:", candidatesError.message);
  } else {
    console.log("  ✓ 删除旧候选新闻");
  }

  console.log("  ✓ read_articles / profiles / words / user_word_states: 不清理（永久保留）");
}

// ==================== Step 2: 爬取新闻 ====================

async function fetchNews(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Step 2/7: 爬取新闻");
  console.log("=".repeat(60));

  const targetDate = getYesterdayUTC();
  console.log(`爬取 ${targetDate} (UTC) 的新闻...`);

  try {
    const module = await import("./fetch-news");
    await module.main();
    console.log("  ✓ 新闻爬取完成");
  } catch (error) {
    if (error instanceof Error && error.message.includes("GUARDIAN_API_KEY")) {
      console.error("  Error: 缺少 GUARDIAN_API_KEY 环境变量");
    } else {
      console.error("  Error:", error);
    }
  }
}

// ==================== Step 3: 专业分类 ====================

async function classifyNews(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Step 3/7: AI 专业分类");
  console.log("=".repeat(60));

  const { data: unclassified, error } = await supabaseAdmin
    .from("news_candidates")
    .select("candidate_id, source_title, source_summary")
    .is("subject_category", null)
    .not("source_title", "is", null)
    .limit(100);

  if (error) {
    console.error("  Error:", error.message);
    return;
  }

  console.log(`  待分类: ${unclassified?.length || 0} 篇`);

  if (!unclassified || unclassified.length === 0) {
    console.log("  ✓ 无待分类新闻");
    return;
  }

  try {
    const module = await import("./classify-news");
    await module.main();
    console.log("  ✓ 专业分类完成");
  } catch (error) {
    console.error("  Error:", error);
  }
}

// ==================== Step 4: 选择文章 ====================

async function selectNews(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Step 4/7: 选择候选文章");
  console.log("=".repeat(60));

  try {
    const module = await import("./select-news");
    await module.main();
    console.log("  ✓ 文章选择完成");
  } catch (error) {
    console.error("  Error:", error);
  }
}

// ==================== Step 5: 文章改写 ====================

async function rewriteNews(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Step 5/7: AI 改写文章");
  console.log("=".repeat(60));

  try {
    const module = await import("./rewrite-news");
    await module.main();
    console.log("  ✓ 文章改写完成");
  } catch (error) {
    console.error("  Error:", error);
  }
}

// ==================== Step 6: Token 生成 ====================

async function tokenizeArticles(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Step 6/7: 生成结构化 Token");
  console.log("=".repeat(60));

  const { data: toTokenize, error } = await supabaseAdmin
    .from("articles")
    .select("id, cet4_body_en, cet6_body_en")
    .not("cet4_body_en", "is", null)
    .is("token_status", null);

  if (error) {
    console.error("  Error:", error.message);
    return;
  }

  console.log(`  待 tokenize: ${toTokenize?.length || 0} 篇`);

  if (!toTokenize || toTokenize.length === 0) {
    console.log("  ✓ 无待处理文章");
    return;
  }

  try {
    const module = await import("./tokenize-articles");
    await module.main();
    console.log("  ✓ Token 生成完成");
  } catch (error) {
    console.error("  Error:", error);
  }
}

// ==================== Step 7: 上下文释义 ====================

async function generateContextualGlosses(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Step 7/7: 生成超纲词上下文释义");
  console.log("=".repeat(60));

  const { data: completed, error } = await supabaseAdmin
    .from("articles")
    .select("id")
    .eq("token_status", "completed");

  if (error) {
    console.error("  Error:", error.message);
    return;
  }

  console.log(`  已完成 tokenize 的文章: ${completed?.length || 0} 篇`);

  if (!completed || completed.length === 0) {
    console.log("  ✓ 无已完成文章");
    return;
  }

  try {
    const module = await import("./generate-contextual-glosses");
    await module.main();
    console.log("  ✓ 上下文释义生成完成");
  } catch (error) {
    console.error("  Error:", error);
  }
}

// ==================== 主函数 ====================

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("WordBread 每日内容生成流水线");
  console.log("执行时间: 北京时间 09:00");
  console.log("=".repeat(60));

  try {
    await cleanupOldData();
    await fetchNews();
    await classifyNews();
    await selectNews();
    await rewriteNews();
    await tokenizeArticles();
    await generateContextualGlosses();

    console.log("\n" + "=".repeat(60));
    console.log("流水线执行完成");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n执行失败:", error);
    process.exit(1);
  }
}

main();
