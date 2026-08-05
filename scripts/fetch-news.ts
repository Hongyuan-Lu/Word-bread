import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";
import { NewsCandidateSchema } from "../src/types/database";
import Parser from "rss-parser";

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
const TIME_ZONE = "UTC";

type GuardianItem = {
  id: string;
  sectionId?: string;
  sectionName?: string;
  webPublicationDate?: string;
  webTitle: string;
  webUrl: string;
  fields?: {
    headline?: string;
    trailText?: string;
    bodyText?: string;
  };
};

type SectionQuota = {
  section_id: string;
  section_name: string;
  max_items: number;
};

const SECTION_QUOTAS: SectionQuota[] = [
  { section_id: "society", section_name: "Society", max_items: 100 },
  { section_id: "technology", section_name: "Technology", max_items: 100 },
  { section_id: "science", section_name: "Science", max_items: 100 },
  { section_id: "environment", section_name: "Environment", max_items: 30 },
  { section_id: "news", section_name: "News", max_items: 30 },
  { section_id: "media", section_name: "Media", max_items: 30 },
  { section_id: "education", section_name: "Education", max_items: 30 },
  { section_id: "law", section_name: "Law", max_items: 30 },
  { section_id: "global-development", section_name: "Global development", max_items: 30 },
  { section_id: "business", section_name: "Business", max_items: 30 },
  { section_id: "us-news", section_name: "US news", max_items: 30 },
  { section_id: "australia-news", section_name: "Australia news", max_items: 30 },
  { section_id: "world", section_name: "World news", max_items: 30 },
  { section_id: "politics", section_name: "Politics", max_items: 30 },
  { section_id: "uk-news", section_name: "UK news", max_items: 30 },
  { section_id: "weather", section_name: "Weather", max_items: 30 },
];

const PAGE_SIZE = 50;
const REQUEST_DELAY_MS = 1100;
const BODY_MAX_WORDS = 500;

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "WordBread/0.1" },
});

const RSS_FEEDS: Array<{ url: string; category: string }> = [
  { url: "https://www.sciencedaily.com/rss/health_medicine.xml", category: "health" },
  { url: "https://www.sciencedaily.com/rss/mind_brain.xml", category: "health" },
  { url: "https://www.sciencedaily.com/rss/computers_math.xml", category: "technology" },
  { url: "https://www.sciencedaily.com/rss/matter_energy.xml", category: "technology" },
  { url: "https://www.sciencedaily.com/rss/space_time.xml", category: "technology" },
  { url: "https://www.sciencedaily.com/rss/plants_animals.xml", category: "environment" },
  { url: "https://www.sciencedaily.com/rss/earth_climate.xml", category: "environment" },
  { url: "https://www.sciencedaily.com/rss/science_society.xml", category: "society" },
  { url: "https://www.sciencedaily.com/rss/business_industry.xml", category: "society" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function stripHtml(input: string | undefined | null): string | null {
  if (!input) return null;
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateWords(input: string | null, maxWords: number): string | null {
  if (!input) return null;
  const words = input.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return input;
  return words.slice(0, maxWords).join(" ");
}

async function fetchGuardianSection(
  sectionId: string,
  targetDate: string
): Promise<GuardianItem[]> {
  const url = new URL("https://content.guardianapis.com/search");
  url.searchParams.set("api-key", GUARDIAN_API_KEY!);
  url.searchParams.set("page", "1");
  url.searchParams.set("page-size", String(PAGE_SIZE));
  url.searchParams.set("order-by", "newest");
  url.searchParams.set("type", "article");
  url.searchParams.set("section", sectionId);
  url.searchParams.set("from-date", targetDate);
  url.searchParams.set("to-date", targetDate);
  url.searchParams.set("show-fields", "headline,trailText,bodyText");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Guardian API error: ${res.status}`);
  }
  const data = (await res.json()) as {
    response: {
      results: GuardianItem[];
    };
  };
  return data.response.results || [];
}

async function fetchScienceDailyFeeds(targetDate: string): Promise<Array<{
  source_url: string;
  source_name: string;
  source_category: string;
  source_title: string;
  source_summary: string | null;
  source_published_at: string | null;
}>> {
  const results: Array<{
    source_url: string;
    source_name: string;
    source_category: string;
    source_title: string;
    source_summary: string | null;
    source_published_at: string | null;
  }> = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        if (!item.pubDate || !item.link) continue;
        const pubDate = new Date(item.pubDate);
        const itemDateStr = getDateInTimeZone(pubDate, TIME_ZONE);
        if (itemDateStr !== targetDate) continue;

        results.push({
          source_url: item.link,
          source_name: "ScienceDaily",
          source_category: feed.category,
          source_title: item.title || "",
          source_summary: stripHtml(item.contentSnippet || item.content || item.summary) || null,
          source_published_at: item.pubDate,
        });
      }
    } catch (error) {
      console.error(`Failed to fetch ${feed.url}:`, error);
    }
    await delay(1000);
  }

  return results;
}

export async function main() {
  if (!GUARDIAN_API_KEY) {
    throw new Error("Missing GUARDIAN_API_KEY");
  }

  const targetDate = getYesterdayUTC();
  console.log(`Fetching news for ${targetDate} (UTC)`);

  const candidates: Array<{
    candidate_id: string;
    source_url: string;
    source_name: string;
    source_category: string;
    source_title: string;
    source_summary: string | null;
    source_body_text: string | null;
    source_published_at: string | null;
  }> = [];

  const seenUrls = new Set<string>();

  console.log("\n--- Fetching Guardian ---");
  let guardianCount = 0;
  for (const quota of SECTION_QUOTAS) {
    const items = await fetchGuardianSection(quota.section_id, targetDate);
    console.log(`${quota.section_id}: ${items.length} items`);

    for (const item of items) {
      if (!item.webUrl || seenUrls.has(item.webUrl)) continue;
      if (item.fields?.headline) {
        seenUrls.add(item.webUrl);
        guardianCount++;
        candidates.push({
          candidate_id: `guardian-${targetDate}-${String(guardianCount).padStart(3, "0")}`,
          source_url: item.webUrl,
          source_name: "The Guardian",
          source_category: quota.section_id,
          source_title: item.fields.headline,
          source_summary: stripHtml(item.fields.trailText) || null,
          source_body_text: truncateWords(stripHtml(item.fields.bodyText), BODY_MAX_WORDS),
          source_published_at: item.webPublicationDate || null,
        });
      }
    }
    await delay(REQUEST_DELAY_MS);
  }

  console.log(`\n--- Fetching ScienceDaily ---`);
  const sdItems = await fetchScienceDailyFeeds(targetDate);
  console.log(`ScienceDaily: ${sdItems.length} items`);

  let sdCount = 0;
  for (const item of sdItems) {
    if (seenUrls.has(item.source_url)) continue;
    seenUrls.add(item.source_url);
    sdCount++;
    candidates.push({
      candidate_id: `sciencedaily-${targetDate}-${String(sdCount).padStart(3, "0")}`,
      source_body_text: null,
      ...item,
    });
  }

  console.log(`\nTotal candidates: ${candidates.length}`);

  if (candidates.length === 0) {
    console.log("No candidates to upload");
    return;
  }

  console.log("\n--- Uploading to Supabase ---");

  const { error } = await supabaseAdmin
    .from("news_candidates")
    .upsert(candidates, { onConflict: "candidate_id" });

  if (error) {
    throw error;
  }

  console.log(`Uploaded ${candidates.length} candidates to news_candidates`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}