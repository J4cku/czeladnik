import {
  getCatalog,
  type AbcQuestion,
  type Category,
  type Difficulty,
  type ExamLevel,
  type OpenQuestion,
} from "./data";
import { sample, shuffle } from "./rng";

const WRITTEN_CATEGORY_IDS = [
  "rachunkowosc",
  "dokumentacja",
  "rysunek",
  "bhp",
  "srodowisko",
  "prawo-pracy",
  "dzialalnosc",
] as const;

export type WrittenExamQuestion = AbcQuestion | OpenQuestion;

function writtenCategoriesFor(level: ExamLevel) {
  const ids: readonly string[] = level === "mistrz"
    ? [...WRITTEN_CATEGORY_IDS, "psychologia", "metodyka"].map((id) => `mistrz-${id}`)
    : WRITTEN_CATEGORY_IDS;
  return getCatalog(level).categories.filter((category) => ids.includes(category.id));
}

export const writtenCategories = writtenCategoriesFor("czeladnik");

/** Arkusz czeladniczy: 7 pytań z działu, w podziale 3 łatwe / 2 średnie / 2 trudne. */
export const EXAM_PER_CATEGORY = 7;

export const EXAM_SPLIT: { difficulty: Difficulty; count: number }[] = [
  { difficulty: "latwe", count: 3 },
  { difficulty: "srednie", count: 2 },
  { difficulty: "trudne", count: 2 },
];

export type CategoryPlan = {
  category: Category;
  graded: boolean;
  available: Record<Difficulty, number>;
};

function poolFor(categoryId: string, level: ExamLevel): WrittenExamQuestion[] {
  return getCatalog(level).questions.filter(
    (question): question is WrittenExamQuestion =>
      question.category === categoryId &&
      (question.kind === "abc" || question.kind === "open"),
  );
}

export function examPlan(level: ExamLevel = "czeladnik"): CategoryPlan[] {
  return writtenCategoriesFor(level).map((category) => {
    const pool = poolFor(category.id, level);
    const available = {
      latwe: pool.filter((question) => question.difficulty === "latwe").length,
      srednie: pool.filter((question) => question.difficulty === "srednie").length,
      trudne: pool.filter((question) => question.difficulty === "trudne").length,
    };
    const graded = EXAM_SPLIT.every(({ difficulty, count }) => available[difficulty] >= count);
    return { category, graded, available };
  });
}

export function examLength(level: ExamLevel = "czeladnik") {
  return writtenCategoriesFor(level).length * EXAM_PER_CATEGORY;
}

export const EXAM_LENGTH = examLength();

export function buildExam(level: ExamLevel = "czeladnik"): WrittenExamQuestion[] {
  const exam: WrittenExamQuestion[] = [];

  for (const { category, graded } of examPlan(level)) {
    if (!graded) {
      throw new Error(`Za mało pytań z poziomami trudności w dziale: ${category.label}`);
    }

    const pool = poolFor(category.id, level);
    const picked = EXAM_SPLIT.flatMap(({ difficulty, count }) =>
      sample(
        pool.filter((question) => question.difficulty === difficulty),
        count,
      ),
    );
    exam.push(...shuffle(picked));
  }

  return exam;
}

/** Próg przyjęty w aplikacji dla części pisemnej. */
export const PASS_THRESHOLD = 0.5;
