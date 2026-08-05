import type {
  TargetExam,
  ExamLevel,
  MasteryStatus,
  DisplayLevel,
} from "@/types/vocab";

export interface ClassifyInput {
  targetExam: TargetExam;
  examLevel: ExamLevel;
  masteryStatus: MasteryStatus;
  isProperNoun?: boolean;
  isNumber?: boolean;
  isPunctuation?: boolean;
}

export interface ClassifyOutput {
  displayLevel: DisplayLevel;
  reason: string;
}

export function classifyDisplayLevel(input: ClassifyInput): ClassifyOutput {
  const {
    targetExam,
    examLevel,
    masteryStatus,
    isProperNoun = false,
    isNumber = false,
    isPunctuation = false,
  } = input;

  if (isPunctuation) {
    return {
      displayLevel: 0,
      reason: "punctuation token: display as plain text",
    };
  }

  if (isNumber) {
    return {
      displayLevel: 0,
      reason: "number token: display as plain text",
    };
  }

  if (isProperNoun) {
    return {
      displayLevel: 0,
      reason: "proper noun: not treated as learning vocabulary",
    };
  }

  if (masteryStatus === "known") {
    return {
      displayLevel: 0,
      reason: "known word: user mastery state overrides default rule",
    };
  }

  if (masteryStatus === "unknown") {
    if (examLevel === "out_of_syllabus") {
      return {
        displayLevel: 2,
        reason: "unknown out_of_syllabus word: show Ruby gloss as Level 2",
      };
    }
    return {
      displayLevel: 1,
      reason: `unknown ${examLevel} word: show Ruby gloss as Level 1`,
    };
  }

  if (targetExam === "CET4") {
    switch (examLevel) {
      case "common":
        return {
          displayLevel: 0,
          reason: "CET4 target: common word treated as basic vocabulary",
        };
      case "CET4":
        return {
          displayLevel: 1,
          reason: "CET4 target: CET4 word is highlighted as Level 1",
        };
      case "CET6":
      case "out_of_syllabus":
        return {
          displayLevel: 2,
          reason: `CET4 target: ${examLevel} word shows Ruby gloss as Level 2`,
        };
    }
  }

  if (targetExam === "CET6") {
    switch (examLevel) {
      case "common":
      case "CET4":
        return {
          displayLevel: 0,
          reason: `CET6 target: ${examLevel} word is treated as basic vocabulary`,
        };
      case "CET6":
        return {
          displayLevel: 1,
          reason: "CET6 target: CET6 word is highlighted as Level 1",
        };
      case "out_of_syllabus":
        return {
          displayLevel: 2,
          reason: "CET6 target: out_of_syllabus word shows Ruby gloss as Level 2",
        };
    }
  }

  return {
    displayLevel: 0,
    reason: "fallback: default to plain text",
  };
}