import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    console.log("=== WordBread 每日内容生成流水线 ===");
    console.log("执行时间: 北京时间 12:00 (UTC 04:00)");

    // Step 1: 数据清理
    console.log("\n--- Step 1/7: 数据清理 ---");
    const articlesCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const articlesCutoffStr = articlesCutoff.toISOString().split("T")[0];

    await supabase
      .from("articles")
      .delete()
      .lt("source_published_at", articlesCutoffStr);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidatesCutoff = yesterday.toISOString().split("T")[0];

    await supabase
      .from("news_candidates")
      .delete()
      .lt("source_published_at", candidatesCutoff);

    console.log("  ✓ 数据清理完成");

    // Step 2: 爬取新闻
    console.log("\n--- Step 2/7: 爬取新闻 ---");
    const { error: fetchError } = await (supabase as any).functions.invoke("fetch-news", {
      method: "POST",
    }).catch(() => ({ error: { message: "Function not configured" } }));

    if (fetchError) {
      console.log("  ⚠ fetch-news 函数未配置，需要手动运行");
    }

    // Step 3: 专业分类
    console.log("\n--- Step 3/7: AI 专业分类 ---");
    const { data: unclassified } = await supabase
      .from("news_candidates")
      .select("candidate_id")
      .is("subject_category", null)
      .not("source_title", "is", null)
      .limit(200);

    console.log(`  待分类: ${unclassified?.length || 0} 篇`);

    if (!unclassified || unclassified.length === 0) {
      console.log("  ✓ 无待分类新闻");
    } else {
      console.log("  ⚠ classify-news 需要手动运行或配置 API key");
    }

    // Step 4: 选择文章
    console.log("\n--- Step 4/7: 选择候选文章 ---");
    const { data: categories } = await supabase
      .from("news_candidates")
      .select("subject_category")
      .not("subject_category", "is", null);

    const uniqueCategories = [...new Set(categories?.map((c: any) => c.subject_category).filter(Boolean) || [])];

    if (uniqueCategories.length === 0) {
      console.log("  ✓ 无候选文章");
    } else {
      console.log(`  发现分类: ${uniqueCategories.join(", ")}`);
      console.log("  ⚠ select-news 需要手动运行");
    }

    // Step 5: 文章改写
    console.log("\n--- Step 5/7: AI 改写文章 ---");
    const { data: toRewrite } = await supabase
      .from("news_candidates")
      .select("candidate_id")
      .eq("is_selected", true)
      .not("subject_category", "is", null);

    console.log(`  待改写: ${toRewrite?.length || 0} 篇`);
    console.log("  ⚠ rewrite-news 需要手动运行或配置 API key");

    // Step 6: Token 生成
    console.log("\n--- Step 6/7: 生成结构化 Token ---");
    const { data: toTokenize } = await supabase
      .from("articles")
      .select("id")
      .not("cet4_body_en", "is", null)
      .is("token_status", null);

    console.log(`  待 tokenize: ${toTokenize?.length || 0} 篇`);
    console.log("  ⚠ tokenize-articles 需要手动运行");

    // Step 7: 上下文释义
    console.log("\n--- Step 7/7: 生成超纲词上下文释义 ---");
    const { data: completed } = await supabase
      .from("articles")
      .select("id")
      .eq("token_status", "completed");

    console.log(`  已完成 tokenize: ${completed?.length || 0} 篇`);
    console.log("  ⚠ generate-contextual-glosses 需要手动运行或配置 API key");

    console.log("\n=== 流水线执行完成 ===");
    console.log("\n注意: AI 相关步骤需要配置 MiniMax API Key");
    console.log("请运行: pnpm tsx scripts/daily-generate.ts 手动完成 AI 步骤");

    return NextResponse.json({
      success: true,
      message: "Daily pipeline completed",
      steps: {
        cleanup: "completed",
        fetch: "需要手动运行",
        classify: "需要手动运行",
        select: "需要手动运行",
        rewrite: "需要手动运行",
        tokenize: "需要手动运行",
        gloss: "需要手动运行",
      },
    });
  } catch (error) {
    console.error("执行失败:", error);
    return NextResponse.json(
      { error: "Pipeline failed", details: String(error) },
      { status: 500 }
    );
  }
}