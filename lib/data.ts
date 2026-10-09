import raw from "./questions.json";

export type Kind = "abc" | "open" | "task";
export type Difficulty = "latwe" | "srednie" | "trudne";
export type ExamLevel = "czeladnik" | "mistrz";

export type QuestionImageData = {
  src: string;
  width: number;
  height: number;
};

export type Category = {
  id: string;
  level: ExamLevel;
  kind: Kind;
  label: string;
  description: string;
  count: number;
};

export type BaseQuestion = {
  id: string;
  level: ExamLevel;
  category: string;
  kind: Kind;
  nr: number;
  prompt: string;
  difficulty?: Difficulty;
  officialNr?: number;
  image?: QuestionImageData;
};

export type AbcQuestion = BaseQuestion & {
  kind: "abc";
  options: [string, string, string];
  answer: number;
};

export type OpenQuestion = BaseQuestion & { kind: "open"; answer: string };
export type TaskQuestion = BaseQuestion & { kind: "task"; time: string };
export type Question = AbcQuestion | OpenQuestion | TaskQuestion;

const data = raw as unknown as { categories: Category[]; questions: Question[] };

function createCatalog(level: ExamLevel) {
  const categories = data.categories.filter((category) => category.level === level);
  const questions = data.questions.filter((question) => question.level === level);

  return {
    categories,
    questions,
    categoryById: new Map(categories.map((category) => [category.id, category])),
    abcCategories: categories.filter((category) => category.kind === "abc"),
    openCategories: categories.filter((category) => category.kind === "open"),
    abcQuestions: questions.filter((question): question is AbcQuestion => question.kind === "abc"),
    openQuestions: questions.filter((question): question is OpenQuestion => question.kind === "open"),
    taskQuestions: questions.filter((question): question is TaskQuestion => question.kind === "task"),
    totalCount: questions.length,
  };
}

const catalogs = {
  czeladnik: createCatalog("czeladnik"),
  mistrz: createCatalog("mistrz"),
};

export function getCatalog(level: ExamLevel = "czeladnik") {
  return catalogs[level];
}

export const {
  categories,
  questions,
  categoryById,
  abcCategories,
  openCategories,
  abcQuestions,
  openQuestions,
  taskQuestions,
  totalCount,
} = getCatalog();

export const difficultyLabel: Record<Difficulty, string> = {
  latwe: "łatwe",
  srednie: "średnie",
  trudne: "trudne",
};

export const LETTERS = ["A", "B", "C"] as const;

/** Polish plural: 1 pytanie, 2–4 pytania, 5+ pytań. */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function questionsWord(n: number) {
  return plural(n, "pytanie", "pytania", "pytań");
}
