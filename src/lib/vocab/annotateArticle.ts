// src/lib/vocab/annotateArticle.ts

import type { TargetExam, ExamLevel } from "../../types/vocab";
import type { TokenType } from "../../types/article";
import {
  tokenize,
  calculateSentenceIndex,
  verifySurfaceReconstruction,
  type RawToken as SurfaceToken,
} from "./tokenize";
import { lemmatizeWord } from "./lemmatize";

export interface WordInfo {
  id: string;
  lemma: string;
  pos: string | null;
  exam_level: ExamLevel;
  cn_gloss: string | null;
  en_definition?: string | null;
}

export interface RawToken extends SurfaceToken {
  token_index: number;
  sentence_index: number;
}

export interface AnnotatedToken {
  token_index: number;
  sentence_index: number;
  surface: string;
  token_type: TokenType;
  lemma: string | null;
  word_id: string | null;
  short_explanation: string | null;
}

export interface ReaderToken extends AnnotatedToken {
  pos: string | null;
  exam_level: ExamLevel | null;
  base_level: 0 | 1 | 2 | null;
  cn_gloss: string | null;
  display_gloss: string | null;
}

export interface AnnotateOptions {
  targetExam: TargetExam;
  lemmaToWordInfo: Map<string, WordInfo>;
}

export function tokenizePreserveSurface(text: string): RawToken[] {
  const surfaceTokens = tokenize(text);
  const sentenceIndices = calculateSentenceIndex(surfaceTokens);

  return surfaceTokens.map((token, index) => ({
    ...token,
    token_index: index,
    sentence_index: sentenceIndices[index] ?? 0,
  }));
}

export function annotateTokens(
  text: string,
  options: AnnotateOptions
): AnnotatedToken[] {
  const { lemmaToWordInfo } = options;
  const rawTokens = tokenizePreserveSurface(text);
  const lemmaSet = new Set(lemmaToWordInfo.keys());

  return rawTokens.map((token) => {
    if (token.token_type !== "word") {
      return {
        ...token,
        lemma: null,
        word_id: null,
        short_explanation: null,
      };
    }

    const lemma = lemmatizeWord(token.surface, lemmaSet);
    const wordInfo = lemmaToWordInfo.get(lemma) ?? null;

    return {
      ...token,
      lemma,
      word_id: wordInfo?.id ?? null,
      short_explanation: null,
    };
  });
}

export function getExamLevel(
  token: Pick<AnnotatedToken, "token_type" | "word_id">,
  wordInfo: WordInfo | null
): ExamLevel | null {
  if (token.token_type !== "word") return null;
  if (token.word_id && wordInfo) return wordInfo.exam_level;
  return "out_of_syllabus";
}

export function calculateBaseLevel(
  targetExam: TargetExam,
  examLevel: ExamLevel | null
): 0 | 1 | 2 | null {
  if (!examLevel) return null;

  if (targetExam === "CET4") {
    if (examLevel === "common") return 0;
    if (examLevel === "CET4") return 1;
    return 2;
  }

  if (examLevel === "common" || examLevel === "CET4") return 0;
  if (examLevel === "CET6") return 1;
  return 2;
}

export function getDisplayGloss(
  token: Pick<AnnotatedToken, "word_id" | "short_explanation">,
  wordInfo: Pick<WordInfo, "cn_gloss"> | null
): string | null {
  if (token.word_id && wordInfo?.cn_gloss) return wordInfo.cn_gloss;
  return token.short_explanation ?? null;
}

/**
 * Helper for reader-side data assembly when the caller already has word info.
 * The production API can also do the same logic via SQL join.
 */
export function serializeTokens(
  tokens: AnnotatedToken[],
  targetExam: TargetExam,
  lemmaToWordInfo: Map<string, WordInfo>
): ReaderToken[] {
  return tokens.map((token) => {
    const wordInfo = token.lemma ? lemmaToWordInfo.get(token.lemma) ?? null : null;
    const examLevel = getExamLevel(token, wordInfo);

    return {
      ...token,
      pos: wordInfo?.pos ?? null,
      exam_level: examLevel,
      base_level: calculateBaseLevel(targetExam, examLevel),
      cn_gloss: wordInfo?.cn_gloss ?? null,
      display_gloss: getDisplayGloss(token, wordInfo),
    };
  });
}

export function verifyTokenization(
  originalText: string,
  tokens: Pick<AnnotatedToken, "surface">[]
): { isValid: boolean; reason?: string } {
  return verifySurfaceReconstruction(originalText, tokens);
}
