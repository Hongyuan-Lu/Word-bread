// src/lib/vocab/index.ts

export { classifyDisplayLevel } from "./classify";
export type { ClassifyInput, ClassifyOutput } from "./classify";

export {
  tokenize,
  calculateSentenceIndex,
  extractWordTokens,
  verifySurfaceReconstruction,
} from "./tokenize";
export type { RawToken } from "./tokenize";

export {
  normalizeWordSurface,
  generateLemmaCandidates,
  lemmatizeWord,
  lemmatize,
  lemmatizeBatch,
} from "./lemmatize";

export {
  annotateTokens,
  calculateBaseLevel,
  serializeTokens,
  verifyTokenization,
  getExamLevel,
  getDisplayGloss,
  tokenizePreserveSurface,
} from "./annotateArticle";

export type {
  WordInfo,
  AnnotatedToken,
  ReaderToken,
  AnnotateOptions,
  RawToken as PositionedRawToken,
} from "./annotateArticle";
