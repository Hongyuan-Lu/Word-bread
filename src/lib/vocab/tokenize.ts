// src/lib/vocab/tokenize.ts

import type { TokenType } from "@/types/article";

export interface RawToken {
  surface: string;
  token_type: TokenType;
}

/**
 * Tokenizer design:
 * - Preserve every character from the original text.
 * - Do not normalize or lemmatize here.
 * - Keep spaces, newlines, punctuation, numbers, and words as separate tokens.
 * - Support common English apostrophes and hyphenated words.
 */
const TOKEN_PATTERN =
  /\r\n|\n|\r|[ \t\f\v]+|[A-Za-z]+(?:[’'][A-Za-z]+)?(?:-[A-Za-z]+(?:[’'][A-Za-z]+)?)*|\d+(?:[.,]\d+)*|[.,!?;:"'“”‘’()[\]{}—–\-@#$%&*+=<>/|\\~`^]+|./gu;

const WORD_PATTERN =
  /^[A-Za-z]+(?:[’'][A-Za-z]+)?(?:-[A-Za-z]+(?:[’'][A-Za-z]+)?)*$/u;
const NUMBER_PATTERN = /^\d+(?:[.,]\d+)*$/u;
const SPACE_PATTERN = /^[ \t\f\v]+$/u;
const NEWLINE_PATTERN = /^\r\n$|^\n$|^\r$/u;
const PUNCTUATION_PATTERN = /^[.,!?;:"'“”‘’()[\]{}—–\-@#$%&*+=<>/|\\~`^]+$/u;

function getTokenType(surface: string): TokenType {
  if (NEWLINE_PATTERN.test(surface)) return "newline";
  if (SPACE_PATTERN.test(surface)) return "space";
  if (WORD_PATTERN.test(surface)) return "word";
  if (NUMBER_PATTERN.test(surface)) return "number";
  if (PUNCTUATION_PATTERN.test(surface)) return "punctuation";
  return "other";
}

export function tokenize(text: string): RawToken[] {
  const tokens: RawToken[] = [];

  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const surface = match[0];
    tokens.push({
      surface,
      token_type: getTokenType(surface),
    });
  }

  return tokens;
}

/**
 * Return sentence indices for tokens while preserving token order.
 *
 * MVP-level rule:
 * - Sentence-ending punctuation increments the sentence index.
 * - A blank line also increments the sentence index.
 */
export function calculateSentenceIndex(tokens: RawToken[]): number[] {
  const sentenceIndices: number[] = [];
  let currentSentence = 0;
  let newlineRun = 0;

  for (const token of tokens) {
    sentenceIndices.push(currentSentence);

    if (token.token_type === "newline") {
      newlineRun += 1;
      if (newlineRun >= 2) {
        currentSentence += 1;
        newlineRun = 0;
      }
      continue;
    }

    if (token.token_type !== "space") {
      newlineRun = 0;
    }

    if (token.token_type === "punctuation" && /[.!?。！？]/u.test(token.surface)) {
      currentSentence += 1;
    }
  }

  return sentenceIndices;
}

function normalizeExtractedWord(surface: string): string {
  return surface
    .trim()
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/^[^a-z0-9]+/gi, "")
    .replace(/[^a-z0-9]+$/gi, "");
}

/**
 * Extract normalized word surfaces only.
 * This is not lemmatization; it is used only to build rough lookup candidates.
 */
export function extractWordTokens(tokens: RawToken[]): string[] {
  return tokens
    .filter((token) => token.token_type === "word")
    .map((token) => normalizeExtractedWord(token.surface))
    .filter(Boolean);
}

export function verifySurfaceReconstruction(
  originalText: string,
  tokens: Pick<RawToken, "surface">[]
): { isValid: boolean; reason?: string } {
  const reconstructed = tokens.map((token) => token.surface).join("");

  if (reconstructed === originalText) {
    return { isValid: true };
  }

  return {
    isValid: false,
    reason: `Reconstructed text does not match original text. Original length: ${originalText.length}, reconstructed length: ${reconstructed.length}`,
  };
}
