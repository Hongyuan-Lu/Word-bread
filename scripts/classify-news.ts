import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { supabaseAdmin } from "../src/lib/supabase/admin";
import { minimaxLLM } from "../src/lib/ai/minimaxLangChainClient";
import { ClassificationResultSchema, SubjectCategories } from "../src/types/database";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

const CLASSIFICATION_RESULTS_SCHEMA = z.object({
  cet4_body_en: z.string(),
  cet4_body_zh: z.string(),
  cet6_body_en: z.string(),
  cet6_body_zh: z.string(),
});

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;
const BATCH_SIZE = 10;
const BODY_MAX_WORDS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonFromResponse(content: string): unknown | null {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      return null;
    }
  }
  const jsonArrayMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (jsonArrayMatch) {
    try {
      return JSON.parse(jsonArrayMatch[0]);
    } catch {
      return null;
    }
  }
  const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

async function classifyBatch(
  candidates: Array<{
    candidate_id: string;
    source_title: string;
    source_summary: string | null;
    source_body_text: string | null;
  }>
): Promise<Array<{
  candidate_id: string;
  subject_category: string;
  subject_confidence: number;
  subject_reason: string;
  secondary_categories?: string[] | null;
}>> {
  const categoriesList = SubjectCategories.map((c) => `- ${c}`).join("\n");
  const categoriesStr = SubjectCategories.join("、");

  let prompt = `你是一个专业的新闻分类助手。

允许的专业类别（必须且只能从以下列表中选择，禁止使用任何其他类别）：
${categoriesList}

分类要求：
1. 根据新闻标题、摘要和正文内容（如有）判断其最符合的专业类别
2. 有些新闻可能没有正文内容，只能根据标题和摘要判断
3. 可以选择最多3个次要类别（secondary_categories）
4. 给出分类置信度（0到1之间）
5. 简要说明分类理由
6. 如果新闻确实难以分类，必须从上面的列表中选择最接近的类别

请对以下${candidates.length}条新闻进行分类：

`;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    prompt += `\n【${c.candidate_id}】`;
    prompt += `\n标题: ${c.source_title}`;
    if (c.source_summary) {
      prompt += `\n摘要: ${c.source_summary}`;
    }
    if (c.source_body_text) {
      const words = c.source_body_text.split(/\s+/).slice(0, BODY_MAX_WORDS).join(" ");
      prompt += `\n正文前${BODY_MAX_WORDS}词: ${words}`;
    }
    prompt += "\n";
  }

  prompt += `
输出格式（只返回JSON数组，不要包含任何思考过程或其他内容）：
[
  {
    "candidate_id": "候选ID",
    "subject_category": "只能是${categoriesStr}之一",
    "subject_confidence": 0.85,
    "subject_reason": "分类理由",
    "secondary_categories": ["只能是${categoriesStr}中的内容"]
  }
]

注意：
- subject_category 只能是 ${categoriesStr} 之一，禁止使用其他类别
- secondary_categories 也只能是 ${categoriesStr} 之一，禁止使用其他类别
- 如果不确定，选择"综合"
- candidate_id 必须完全匹配输入中的ID字符串
- 必须返回有效的JSON数组
- 必须严格返回${candidates.length}个结果`;

  const systemPrompt = `你是一个专业的新闻分类助手。

允许的专业类别（必须且只能从以下列表中选择，禁止使用任何其他类别）：
${categoriesList}

重要警告：
- subject_category 禁止使用"政治学"、"社会学"等不在列表中的任何类别
- secondary_categories 也禁止使用不在列表中的任何类别
- 如果新闻确实难以分类，必须从上面的列表中选择最接近的类别
- 如果不确定，选择"综合"
- 违反上述规则的回答将被视为错误`;

  const userPrompt = prompt;

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
        console.error(`Batch: JSON解析失败，第${attempt}次重试`);
        if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
        continue;
      }

      const validated = ClassificationResultSchema.array().safeParse(parsed);
      if (!validated.success) {
        console.error(`Batch: Zod校验失败，第${attempt}次重试`);
        console.error("实际返回:", JSON.stringify(parsed, null, 2).slice(0, 500));
        if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
        continue;
      }

      return validated.data;
    } catch (error) {
      console.error(`Batch: 调用失败，第${attempt}次重试 - ${error}`);
      if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS);
    }
  }

  throw new Error(`Batch classification failed after ${MAX_RETRIES} retries`);
}

export async function main() {
  const { data: candidates, error: fetchError } = await supabaseAdmin
    .from("news_candidates")
    .select("candidate_id, source_title, source_summary, source_body_text")
    .is("subject_category", null);

  if (fetchError) {
    throw fetchError;
  }

  if (!candidates || candidates.length === 0) {
    console.log("No unclassified candidates found");
    return;
  }

  console.log(`Found ${candidates.length} unclassified candidates`);

  const validIds = new Set(candidates.map((c) => c.candidate_id));

  function normalizeCandidateId(id: string): string {
    let normalized = id.trim();
    normalized = normalized.replace(/,+$/, "");
    normalized = normalized.replace(/\s+$/, "");
    normalized = normalized.replace(/^\s+/, "");
    return normalized;
  }

  function findMatchingCandidateId(returnedId: string): string | null {
    const normalized = normalizeCandidateId(returnedId);
    if (validIds.has(normalized)) return normalized;

    const decoded = decodeURIComponent(normalized);
    if (validIds.has(decoded)) return decoded;

    return null;
  }

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    console.log(`Classifying batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidates.length / BATCH_SIZE)}`);

    const results = await classifyBatch(batch);

    for (const result of results) {
      const matchedId = findMatchingCandidateId(result.candidate_id);
      if (!matchedId) {
        console.error(`Unknown candidate_id: ${result.candidate_id}`);
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from("news_candidates")
        .update({
          subject_category: result.subject_category,
          subject_confidence: result.subject_confidence,
          subject_reason: result.subject_reason,
          secondary_categories: result.secondary_categories,
        })
        .eq("candidate_id", matchedId);

      if (updateError) {
        console.error(`Failed to update ${matchedId}:`, updateError);
      }
    }

    if (i + BATCH_SIZE < candidates.length) {
      await delay(RETRY_DELAY_MS);
    }
  }

  console.log("Classification complete");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}