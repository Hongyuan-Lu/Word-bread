import { z } from "zod";

export const NewsCandidateSchema = z.object({
  candidate_id: z.string(),
  source_url: z.string().nullable(),
  source_name: z.string().nullable(),
  source_category: z.string().nullable(),
  source_title: z.string().nullable(),
  source_summary: z.string().nullable(),
  source_body_text: z.string().nullable(),
  source_published_at: z.string().datetime().nullable(),
  subject_category: z.string().nullable(),
  subject_confidence: z.number().nullable(),
  subject_reason: z.string().nullable(),
  secondary_categories: z.array(z.string()).nullable(),
  is_selected: z.boolean().default(false),
  is_selected_rank: z.number().nullable(),
});

export type NewsCandidate = z.infer<typeof NewsCandidateSchema>;

export const ArticleSchema = z.object({
  id: z.string().uuid().optional(),
  candidate_id: z.string(),
  source_url: z.string().nullable(),
  source_name: z.string().nullable(),
  source_published_at: z.string().datetime().nullable(),
  subject_category: z.string().nullable(),
  title_en: z.string().nullable(),
  title_zh: z.string().nullable(),
  cet4_body_en: z.string().nullable(),
  cet4_body_zh: z.string().nullable(),
  cet6_body_en: z.string().nullable(),
  cet6_body_zh: z.string().nullable(),
  token_status: z.string().nullable().optional(),
  tokenized_at: z.string().datetime().nullable().optional(),
});

export type Article = z.infer<typeof ArticleSchema>;

export const ExamLevels = ["common", "CET4", "CET6", "out_of_syllabus"] as const;
export type ExamLevel = (typeof ExamLevels)[number];

export const DisplayLevels = [0, 1, 2] as const;
export type DisplayLevel = (typeof DisplayLevels)[number];

export const TokenTypes = ["word", "space", "punctuation", "newline", "number", "other"] as const;
export type TokenType = (typeof TokenTypes)[number];

export const ArticleTokenSchema = z.object({
  id: z.string().uuid().optional(),
  article_id: z.string().uuid(),
  target_exam: z.enum(["CET4", "CET6"]),
  token_index: z.number().int(),
  sentence_index: z.number().int(),
  surface: z.string(),
  token_type: z.enum(TokenTypes),
  lemma: z.string().nullable(),
  word_id: z.string().uuid().nullable(),
  short_explanation: z.string().nullable(),
  created_at: z.string().datetime().optional(),
});

export type ArticleToken = z.infer<typeof ArticleTokenSchema>;

export const SubjectCategories = [
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

export type SubjectCategory = (typeof SubjectCategories)[number];

export const ClassificationResultSchema = z.object({
  candidate_id: z.string(),
  subject_category: z.enum(SubjectCategories),
  subject_confidence: z.number().min(0).max(1),
  subject_reason: z.string(),
  secondary_categories: z.array(z.enum(SubjectCategories)).max(3).optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const RewriteResultSchema = z.object({
  title_zh: z.string().min(1),
  cet4_body_en: z.string().min(1),
  cet4_body_zh: z.string().min(1),
  cet6_body_en: z.string().min(1),
  cet6_body_zh: z.string().min(1),
});

export type RewriteResult = z.infer<typeof RewriteResultSchema>;