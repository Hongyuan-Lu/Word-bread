import { classifyDisplayLevel } from "../src/lib/vocab/classify";

function assertEqual(
  name: string,
  actual: unknown,
  expected: unknown
): void {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, got ${actual}`);
  }
  console.log(`✅ PASS: ${name}`);
}

console.log("\n=== CET4 Target Mode Tests ===\n");

assertEqual(
  "CET4 + common → Level 0",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "common",
    masteryStatus: null,
  }).displayLevel,
  0
);

assertEqual(
  "CET4 + CET4 → Level 1",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET4",
    masteryStatus: null,
  }).displayLevel,
  1
);

assertEqual(
  "CET4 + CET6 → Level 2",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET6",
    masteryStatus: null,
  }).displayLevel,
  2
);

assertEqual(
  "CET4 + out_of_syllabus → Level 2",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "out_of_syllabus",
    masteryStatus: null,
  }).displayLevel,
  2
);

console.log("\n=== CET6 Target Mode Tests ===\n");

assertEqual(
  "CET6 + common → Level 0",
  classifyDisplayLevel({
    targetExam: "CET6",
    examLevel: "common",
    masteryStatus: null,
  }).displayLevel,
  0
);

assertEqual(
  "CET6 + CET4 → Level 0",
  classifyDisplayLevel({
    targetExam: "CET6",
    examLevel: "CET4",
    masteryStatus: null,
  }).displayLevel,
  0
);

assertEqual(
  "CET6 + CET6 → Level 1",
  classifyDisplayLevel({
    targetExam: "CET6",
    examLevel: "CET6",
    masteryStatus: null,
  }).displayLevel,
  1
);

assertEqual(
  "CET6 + out_of_syllabus → Level 2",
  classifyDisplayLevel({
    targetExam: "CET6",
    examLevel: "out_of_syllabus",
    masteryStatus: null,
  }).displayLevel,
  2
);

console.log("\n=== Mastery Status Override Tests ===\n");

assertEqual(
  "known + CET4 → Level 0",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET4",
    masteryStatus: "known",
  }).displayLevel,
  0
);

assertEqual(
  "known + CET6 → Level 0",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET6",
    masteryStatus: "known",
  }).displayLevel,
  0
);

assertEqual(
  "known + out_of_syllabus → Level 0",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "out_of_syllabus",
    masteryStatus: "known",
  }).displayLevel,
  0
);

assertEqual(
  "unknown + common → Level 1",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "common",
    masteryStatus: "unknown",
  }).displayLevel,
  1
);

assertEqual(
  "unknown + CET4 → Level 1",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET4",
    masteryStatus: "unknown",
  }).displayLevel,
  1
);

assertEqual(
  "unknown + CET6 → Level 1",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET6",
    masteryStatus: "unknown",
  }).displayLevel,
  1
);

assertEqual(
  "unknown + out_of_syllabus → Level 2",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "out_of_syllabus",
    masteryStatus: "unknown",
  }).displayLevel,
  2
);

console.log("\n=== Non-Learning Token Tests ===\n");

assertEqual(
  "isPunctuation = true → Level 0",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET6",
    masteryStatus: null,
    isPunctuation: true,
  }).displayLevel,
  0
);

assertEqual(
  "isNumber = true → Level 0",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET6",
    masteryStatus: null,
    isNumber: true,
  }).displayLevel,
  0
);

assertEqual(
  "isProperNoun = true → Level 0",
  classifyDisplayLevel({
    targetExam: "CET4",
    examLevel: "CET6",
    masteryStatus: null,
    isProperNoun: true,
  }).displayLevel,
  0
);

console.log("\n=== All Tests Passed! ===\n");