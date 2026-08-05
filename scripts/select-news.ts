import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";

const MAX_SELECTED = 3;

export async function main() {
  console.log(`Selecting top ${MAX_SELECTED} candidates per category...`);

  const { data: categories, error: catError } = await supabaseAdmin
    .from("news_candidates")
    .select("subject_category")
    .not("subject_category", "is", null);

  if (catError) {
    throw catError;
  }

  const uniqueCategories = [...new Set(categories?.map((c) => c.subject_category).filter(Boolean) || [])];
  console.log(`Found categories: ${uniqueCategories.join(", ")}`);

  await supabaseAdmin
    .from("news_candidates")
    .update({ is_selected: false, is_selected_rank: null })
    .eq("is_selected", true);

  let totalSelected = 0;

  for (const category of uniqueCategories) {
    const { data: candidates, error } = await supabaseAdmin
      .from("news_candidates")
      .select("candidate_id, subject_confidence, subject_category")
      .eq("subject_category", category)
      .order("subject_confidence", { ascending: false })
      .limit(MAX_SELECTED);

    if (error) {
      console.error(`Error selecting for ${category}:`, error);
      continue;
    }

    if (!candidates || candidates.length === 0) {
      continue;
    }

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      await supabaseAdmin
        .from("news_candidates")
        .update({ is_selected: true, is_selected_rank: i + 1 })
        .eq("candidate_id", c.candidate_id);
    }

    console.log(`Selected ${candidates.length} for ${category}`);
    totalSelected += candidates.length;
  }

  console.log(`\nTotal selected: ${totalSelected}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}