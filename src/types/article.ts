import { z } from "zod";
import type { ExamLevel, DisplayLevel } from "./vocab";

export type TokenType = "word" | "space" | "punctuation" | "newline" | "number" | "other";

export interface ArticleToken {
  id?: string;
  article_id?: string;
  target_exam?: "CET4" | "CET6";
  token_index: number;
  sentence_index: number;
  surface: string;
  token_type: TokenType;
  lemma: string | null;
  word_id: string | null;
  short_explanation?: string | null;
}

const ArticleTokenSchemaInternal = z.object({
  id: z.string().optional(),
  article_id: z.string().optional(),
  target_exam: z.enum(["CET4", "CET6"]).optional(),
  token_index: z.number().int(),
  sentence_index: z.number().int(),
  surface: z.string(),
  token_type: z.enum(["word", "space", "punctuation", "newline", "number", "other"]),
  lemma: z.string().nullable(),
  word_id: z.string().uuid().nullable(),
  short_explanation: z.string().nullable().optional(),
});

export const ArticleTokenSchema = ArticleTokenSchemaInternal;
export const ArticleTokensSchema = z.array(ArticleTokenSchemaInternal);

export function calculateBaseLevel(
  targetExam: "CET4" | "CET6",
  examLevel: ExamLevel | null
): DisplayLevel {
  if (!examLevel) {
    return 2;
  }

  if (targetExam === "CET4") {
    switch (examLevel) {
      case "common":
        return 0;
      case "CET4":
        return 1;
      case "CET6":
      case "out_of_syllabus":
        return 2;
    }
  }

  if (targetExam === "CET6") {
    switch (examLevel) {
      case "common":
      case "CET4":
        return 0;
      case "CET6":
        return 1;
      case "out_of_syllabus":
        return 2;
    }
  }

  return 2;
}

export function getExamLevel(
  tokenType: TokenType,
  wordId: string | null,
  wordsExamLevel: ExamLevel | null
): ExamLevel | null {
  if (tokenType !== "word") {
    return null;
  }

  if (wordId !== null) {
    return wordsExamLevel;
  }

  return "out_of_syllabus";
}

export function getDisplayGloss(
  wordId: string | null,
  cnGloss: string | null,
  shortExplanation: string | null
): string | null {
  if (wordId !== null && cnGloss !== null) {
    return cnGloss;
  }

  return shortExplanation;
}
