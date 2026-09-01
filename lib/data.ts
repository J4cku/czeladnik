import raw from "./questions.json";

export type Kind = "abc" | "open" | "task";
export type Difficulty = "latwe" | "srednie" | "trudne";

export type Category = {
  id: string;
  kind: Kind;
  label: string;
  description: string;
  count: number;
};

export type BaseQuestion = {
  id: string;
  category: string;
  kind: Kind;
  nr: number;
  prompt: string;
  difficulty?: Difficulty;
  officialNr?: number;
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

export const categories = data.categories;
export const questions = data.questions;

export const categoryById = new Map(categories.map((c) => [c.id, c]));

export const abcCategories = categories.filter((c) => c.kind === "abc");
export const openCategories = categories.filter((c) => c.kind === "open");

export const abcQuestions = questions.filter(
  (q): q is AbcQuestion => q.kind === "abc",
);
export const openQuestions = questions.filter(
  (q): q is OpenQuestion => q.kind === "open",
);
export const taskQuestions = questions.filter(
  (q): q is TaskQuestion => q.kind === "task",
);

export const totalCount = questions.length;

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
