import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";

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

async function main() {
  console.log("=== WordBread Data Cleanup ===\n");

  const articlesCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const articlesCutoffDate = getDateInTimeZone(articlesCutoff, TIME_ZONE);

  console.log(`[1/3] Deleting articles older than ${articlesCutoffDate}...`);
  const { error: articlesError } = await supabaseAdmin
    .from("articles")
    .delete()
    .lt("source_published_at", articlesCutoffDate);

  if (articlesError) {
    console.error("    Error:", articlesError.message);
  } else {
    console.log("    ✓ Deleted old articles (and their article_tokens via cascade)");
  }

  const candidatesCutoff = getYesterdayUTC();

  console.log(`\n[2/3] Deleting news_candidates older than ${candidatesCutoff}...`);
  const { error: candidatesError } = await supabaseAdmin
    .from("news_candidates")
    .delete()
    .lt("source_published_at", candidatesCutoff);

  if (candidatesError) {
    console.error("    Error:", candidatesError.message);
  } else {
    console.log("    ✓ Deleted old news_candidates");
  }

  console.log("\n[3/3] read_articles: Skipped (permanent user history)");

  console.log("\n=== Cleanup Complete ===");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
