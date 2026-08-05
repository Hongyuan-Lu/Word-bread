import type { ArticleToken } from "../../types/database";

export interface TargetToken {
  token_id: string;
  token_index: number;
  sentence_index: number;
  surface: string;
  lemma: string;
  current_sentence: string;
  previous_sentence: string | null;
  next_sentence: string | null;
}

export interface GlossBatchInput {
  article_id: string;
  target_exam: "CET4" | "CET6";
  article_text: string;
  target_tokens: TargetToken[];
}

function reconstructSentence(tokens: ArticleToken[], sentenceIndex: number): string {
  const sentenceTokens = tokens
    .filter((t) => t.sentence_index === sentenceIndex)
    .sort((a, b) => a.token_index - b.token_index);
  return sentenceTokens.map((t) => t.surface).join("");
}

export function buildGlossBatchInput(
  articleId: string,
  targetExam: "CET4" | "CET6",
  tokens: ArticleToken[]
): GlossBatchInput {
  const sortedTokens = [...tokens].sort((a, b) => a.token_index - b.token_index);
  const articleText = sortedTokens.map((t) => t.surface).join("");

  const sentenceIndices = [...new Set(sortedTokens.map((t) => t.sentence_index))].sort(
    (a, b) => a - b
  );

  const sentenceMap = new Map<number, string>();
  for (const si of sentenceIndices) {
    sentenceMap.set(si, reconstructSentence(sortedTokens, si));
  }

  const targetTokens: TargetToken[] = sortedTokens
    .filter(
      (t) =>
        t.token_type === "word" &&
        t.word_id === null &&
        t.short_explanation === null &&
        t.lemma !== null
    )
    .map((t) => {
      const currentIdx = sentenceIndices.indexOf(t.sentence_index);
      const previousIdx = currentIdx - 1;
      const nextIdx = currentIdx + 1;

      return {
        token_id: t.id!,
        token_index: t.token_index,
        sentence_index: t.sentence_index,
        surface: t.surface,
        lemma: t.lemma!,
        current_sentence: sentenceMap.get(t.sentence_index) || "",
        previous_sentence: previousIdx >= 0 ? sentenceMap.get(sentenceIndices[previousIdx]) || null : null,
        next_sentence: nextIdx < sentenceIndices.length ? sentenceMap.get(sentenceIndices[nextIdx]) || null : null,
      };
    });

  return {
    article_id: articleId,
    target_exam: targetExam,
    article_text: articleText,
    target_tokens: targetTokens,
  };
}

export function splitIntoBatches(input: GlossBatchInput, maxBatchSize: number = 30): GlossBatchInput[] {
  if (input.target_tokens.length <= maxBatchSize) {
    return [input];
  }

  const batches: GlossBatchInput[] = [];
  for (let i = 0; i < input.target_tokens.length; i += maxBatchSize) {
    batches.push({
      article_id: input.article_id,
      target_exam: input.target_exam,
      article_text: input.article_text,
      target_tokens: input.target_tokens.slice(i, i + maxBatchSize),
    });
  }
  return batches;
}