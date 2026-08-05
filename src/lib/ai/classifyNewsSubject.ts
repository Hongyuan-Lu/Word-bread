import { z } from "zod";

export const SUBJECT_CATEGORIES = [
  "综合",
  "农业与环境学",
  "生物学",
  "化学",
  "物理学",
  "医学",
  "经济学",
  "法学",
  "计算机科学",
  "工程学",
  "艺术学",
  "哲学",
  "教育学",
  "文学",
  "历史学",
  "管理学",
] as const;

export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number];

export const SubjectCategorySchema = z.enum(SUBJECT_CATEGORIES);

export const ClassificationResultSchema = z.object({
  candidate_id: z.string(),
  subject_category: SubjectCategorySchema,
  subject_confidence: z.number().min(0).max(1),
  subject_reason: z.string(),
  secondary_categories: z.array(SubjectCategorySchema).max(3).optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const ClassificationResultsSchema = z.array(ClassificationResultSchema);

export function validateClassificationResults(
  results: unknown,
  validCandidateIds: Set<string>
): {
  valid: ClassificationResult[];
  invalid: string[];
} {
  const valid: ClassificationResult[] = [];
  const invalid: string[] = [];

  const parseResult = ClassificationResultsSchema.safeParse(results);

  if (!parseResult.success) {
    return { valid: [], invalid: Array.from(validCandidateIds) };
  }

  for (const item of parseResult.data) {
    let candidateId = item.candidate_id.trim();
    candidateId = candidateId.replace(/,+$/, "");
    candidateId = candidateId.replace(/\s+$/, "");
    candidateId = candidateId.replace(/^\s+/, "");

    if (validCandidateIds.has(candidateId)) {
      valid.push({ ...item, candidate_id: candidateId });
      continue;
    }

    const decodedId = decodeURIComponent(candidateId);
    if (validCandidateIds.has(decodedId)) {
      valid.push({ ...item, candidate_id: decodedId });
      continue;
    }

    const normalizedId = decodeURIComponent(candidateId.replace(/\/+/g, "/"));
    if (validCandidateIds.has(normalizedId)) {
      valid.push({ ...item, candidate_id: normalizedId });
      continue;
    }

    const urlMatch = candidateId.match(/^guardian-(.+)$/);
    if (urlMatch) {
      const fullId = `guardian-${decodeURIComponent(urlMatch[1])}`;
      if (validCandidateIds.has(fullId)) {
        valid.push({ ...item, candidate_id: fullId });
        continue;
      }
    }

    invalid.push(candidateId);
  }

  return { valid, invalid };
}

export function buildClassificationPrompt(
  candidates: Array<{
    id: string;
    source_title: string;
    source_summary: string | null;
    source_body_text?: string | null;
  }>,
  bodyTextFirstNWords: number = 500
): string {
  const categoriesList = SUBJECT_CATEGORIES.map((c) => `- ${c}`).join("\n");

  let prompt = `你是一个专业的新闻分类助手。

允许的专业类别（必须且只能从以下列表中选择）：
${categoriesList}

请对以下${candidates.length}条新闻进行分类。

`;

  for (const candidate of candidates) {
    prompt += `\n【新闻 ${candidate.id}】`;
    prompt += `\n标题: ${candidate.source_title}`;

    if (candidate.source_summary) {
      prompt += `\n摘要: ${candidate.source_summary}`;
    }

    if (candidate.source_body_text) {
      const words = candidate.source_body_text.split(/\s+/).slice(0, bodyTextFirstNWords).join(" ");
      prompt += `\n正文前${bodyTextFirstNWords}词: ${words}`;
      prompt += `\n（注：仅提供正文前${bodyTextFirstNWords}词作为参考）`;
    }

    prompt += "\n";
  }

  prompt += `
输出格式（只返回JSON数组，不要包含任何思考过程或其他内容）：
[
  {
    "candidate_id": "候选ID（必须是输入中的完整ID，不能简化或改写）",
    "subject_category": "主类别",
    "subject_confidence": 0.85,
    "subject_reason": "分类理由",
    "secondary_categories": ["次要类别1", "次要类别2"]
  }
]

注意：
- candidate_id 必须完全匹配输入中的ID字符串，不要简化或改写
- 必须返回有效的JSON数组
- 必须严格返回${candidates.length}个结果，与输入的新闻条数一致
- 每个元素必须包含所有必需字段`;

  return prompt;
}