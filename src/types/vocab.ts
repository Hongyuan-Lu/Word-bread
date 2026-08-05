export type TargetExam = "CET4" | "CET6";

export type ExamLevel =
  | "common"
  | "CET4"
  | "CET6"
  | "out_of_syllabus";

export type MasteryStatus =
  | "known"
  | "learning"
  | "unknown"
  | null;

export type DisplayLevel = 0 | 1 | 2;

export type VocabType = "study_plan" | "difficult";

export type MajorCategory =
  | "综合"
  | "农业与环境学"
  | "生物学"
  | "化学"
  | "物理学"
  | "医学"
  | "经济学"
  | "法学"
  | "计算机科学"
  | "工程学"
  | "艺术学"
  | "哲学"
  | "教育学"
  | "文学"
  | "历史学"
  | "管理学";

export const MAJOR_CATEGORIES: MajorCategory[] = [
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
];