// src/lib/vocab/lemmatize.ts

/**
 * Conservative dictionary-verified lemmatizer for WordBread.
 *
 * Critical design:
 * - This is NOT a stemmer.
 * - It never returns a suffix-stripped candidate unless that candidate exists
 *   in the provided lemmaSet from the words table.
 * - If no candidate is verified, it returns the normalized original word.
 *
 * This prevents errors such as:
 *   this -> thi
 *   precious -> preciou
 *   yes -> y
 *   callous -> callou
 *   manufacturing -> manufactur
 *   humiliating -> humiliat
 *   only -> on
 */

const IRREGULAR_LEMMAS: Record<string, string[]> = {
  // nouns
  children: ["child"],
  men: ["man"],
  women: ["woman"],
  people: ["person", "people"],
  mice: ["mouse"],
  feet: ["foot"],
  teeth: ["tooth"],
  geese: ["goose"],
  oxen: ["ox"],

  // be / have / do
  am: ["be"],
  is: ["be"],
  are: ["be"],
  was: ["be"],
  were: ["be"],
  been: ["be"],
  being: ["be"],
  has: ["have"],
  had: ["have"],
  does: ["do"],
  did: ["do"],
  done: ["do"],

  // frequent irregular verbs
  went: ["go"],
  gone: ["go"],
  made: ["make"],
  took: ["take"],
  taken: ["take"],
  gave: ["give"],
  given: ["give"],
  saw: ["see"],
  seen: ["see"],
  came: ["come"],
  became: ["become"],
  found: ["find"],
  thought: ["think"],
  brought: ["bring"],
  bought: ["buy"],
  taught: ["teach"],
  caught: ["catch"],
  told: ["tell"],
  said: ["say"],
  paid: ["pay"],
  wrote: ["write"],
  written: ["write"],
  spoke: ["speak"],
  spoken: ["speak"],
  broke: ["break"],
  broken: ["break"],
  chose: ["choose"],
  chosen: ["choose"],
  drove: ["drive"],
  driven: ["drive"],
  ate: ["eat"],
  eaten: ["eat"],
  ran: ["run"],
  began: ["begin"],
  begun: ["begin"],
  won: ["win"],
  lost: ["lose"],
  built: ["build"],
  kept: ["keep"],
  left: ["leave"],
  felt: ["feel"],
  met: ["meet"],
  held: ["hold"],
  heard: ["hear"],

  // comparative / superlative
  better: ["good", "well"],
  best: ["good", "well"],
  worse: ["bad"],
  worst: ["bad"],
  farther: ["far"],
  farthest: ["far"],
  further: ["far"],
  furthest: ["far"],
};

/**
 * Words that are commonly damaged by naive suffix stripping.
 * These are protected at candidate-generation level. Exact dictionary match
 * still has the highest priority before candidate generation.
 */
const PROTECTED_WORDS = new Set([
  "this",
  "his",
  "is",
  "as",
  "us",
  "yes",
  "only",
  "always",
  "news",
  "series",
  "species",
  "physics",
  "mathematics",
  "economics",
  "politics",
  "precious",
  "previous",
  "serious",
  "various",
  "obvious",
  "curious",
  "callous",
  "famous",
]);

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function isConsonant(char: string): boolean {
  return /^[bcdfghjklmnpqrstvwxyz]$/.test(char);
}

function endsWithDoubleConsonant(word: string): boolean {
  if (word.length < 2) return false;

  const last = word[word.length - 1];
  const prev = word[word.length - 2];

  return last === prev && isConsonant(last);
}

/**
 * Normalize a surface token while preserving meaningful internal apostrophes
 * and hyphens. This function must not do any morphological trimming.
 */
export function normalizeWordSurface(surface: string): string {
  return surface
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/^[^a-z0-9]+/gi, "")
    .replace(/[^a-z0-9]+$/gi, "");
}

/**
 * Generate possible lemma candidates.
 *
 * These candidates are never final by themselves. A caller must verify them
 * with lemmaSet.has(candidate) before using them.
 */
export function generateLemmaCandidates(word: string): string[] {
  const candidates: string[] = [];

  if (!word) return candidates;

  candidates.push(word);

  if (PROTECTED_WORDS.has(word)) {
    return unique(candidates);
  }

  const irregular = IRREGULAR_LEMMAS[word];
  if (irregular) {
    candidates.push(...irregular);
  }

  // Possessive: scientist's -> scientist, students' -> students / student.
  if (word.endsWith("'s") && word.length > 3) {
    candidates.push(word.slice(0, -2));
  }

  if (word.endsWith("'") && word.length > 2) {
    candidates.push(word.slice(0, -1));
  }

  // Plural nouns: studies -> study.
  if (word.endsWith("ies") && word.length > 4) {
    candidates.push(word.slice(0, -3) + "y");
  }

  // Plural nouns: knives -> knife / wolves -> wolf.
  if (word.endsWith("ves") && word.length > 4) {
    candidates.push(word.slice(0, -3) + "fe");
    candidates.push(word.slice(0, -3) + "f");
  }

  // Plural nouns: boxes -> box, watches -> watch, dishes -> dish.
  if (
    word.endsWith("es") &&
    word.length > 4 &&
    (word.endsWith("ses") ||
      word.endsWith("xes") ||
      word.endsWith("zes") ||
      word.endsWith("ches") ||
      word.endsWith("shes"))
  ) {
    candidates.push(word.slice(0, -2));
  }

  // Plural nouns: heroes / tomatoes -> hero / tomato.
  if (word.endsWith("oes") && word.length > 4) {
    candidates.push(word.slice(0, -2));
  }

  // Regular plural: phones -> phone.
  // Avoid dangerous endings such as -ss, -us, -is, -ous.
  if (
    word.endsWith("s") &&
    word.length > 3 &&
    !word.endsWith("ss") &&
    !word.endsWith("us") &&
    !word.endsWith("is") &&
    !word.endsWith("ous")
  ) {
    candidates.push(word.slice(0, -1));
  }

  // Past tense: studied -> study.
  if (word.endsWith("ied") && word.length > 4) {
    candidates.push(word.slice(0, -3) + "y");
  }

  // Past tense: used -> use, loved -> love, stopped -> stop.
  if (word.endsWith("ed") && word.length > 3) {
    const withoutEd = word.slice(0, -2);

    // Prioritize e-restoration before bare stem to avoid used -> us.
    candidates.push(word.slice(0, -1));

    // stopped -> stop, planned -> plan.
    if (endsWithDoubleConsonant(withoutEd)) {
      candidates.push(withoutEd.slice(0, -1));
    }

    // Low-priority fallback candidate; still requires lemmaSet verification.
    candidates.push(withoutEd);
  }

  // Present participle / gerund.
  if (word.endsWith("ing") && word.length > 5) {
    const withoutIng = word.slice(0, -3);

    // making -> make, using -> use,
    // manufacturing -> manufacture, humiliating -> humiliate.
    // This must be before the bare stem to avoid manufactur / humiliat.
    candidates.push(withoutIng + "e");

    // running -> run, stopping -> stop.
    if (endsWithDoubleConsonant(withoutIng)) {
      candidates.push(withoutIng.slice(0, -1));
    }

    // opening -> open, reading -> read.
    candidates.push(withoutIng);

    // lying -> lie, dying -> die, tying -> tie.
    if (word.endsWith("ying") && word.length > 5) {
      candidates.push(word.slice(0, -4) + "ie");
    }
  }

  // Deliberately DO NOT handle -ly. It causes errors such as only -> on.

  return unique(candidates);
}

/**
 * Main API: lemmatize one word with dictionary verification.
 */
export function lemmatizeWord(surface: string, lemmaSet: Set<string>): string {
  const normalized = normalizeWordSurface(surface);

  if (!normalized) return normalized;

  // Exact words-table match has absolute priority.
  if (lemmaSet.has(normalized)) return normalized;

  const candidates = generateLemmaCandidates(normalized);

  for (const candidate of candidates) {
    if (lemmaSet.has(candidate)) {
      return candidate;
    }
  }

  // Unknown / out-of-syllabus fallback: preserve the normalized original.
  return normalized;
}

/**
 * Backward-compatible export.
 *
 * If lemmaSet is not supplied, we intentionally do NOT guess. This prevents
 * older call sites from doing destructive stemming accidentally.
 */
export function lemmatize(surface: string, lemmaSet?: Set<string>): string {
  if (!lemmaSet) return normalizeWordSurface(surface);
  return lemmatizeWord(surface, lemmaSet);
}

/** Backward-compatible batch export. */
export function lemmatizeBatch(
  surfaces: string[],
  lemmaSet?: Set<string>
): string[] {
  return surfaces.map((surface) => lemmatize(surface, lemmaSet));
}
