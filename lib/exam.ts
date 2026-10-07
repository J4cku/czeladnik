import {
  categories,
  questions,
  type AbcQuestion,
  type Category,
  type Difficulty,
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

export const writtenCategories = categories.filter((category) =>
  WRITTEN_CATEGORY_IDS.includes(category.id as (typeof WRITTEN_CATEGORY_IDS)[number]),
);

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

function poolFor(categoryId: string): WrittenExamQuestion[] {
  return questions.filter(
    (question): question is WrittenExamQuestion =>
      question.category === categoryId &&
      (question.kind === "abc" || question.kind === "open"),
  );
}

export function examPlan(): CategoryPlan[] {
  return writtenCategories.map((category) => {
    const pool = poolFor(category.id);
    const available = {
      latwe: pool.filter((question) => question.difficulty === "latwe").length,
      srednie: pool.filter((question) => question.difficulty === "srednie").length,
      trudne: pool.filter((question) => question.difficulty === "trudne").length,
    };
    const graded = EXAM_SPLIT.every(({ difficulty, count }) => available[difficulty] >= count);
    return { category, graded, available };
  });
}

export const EXAM_LENGTH = writtenCategories.length * EXAM_PER_CATEGORY;

export function buildExam(): WrittenExamQuestion[] {
  const exam: WrittenExamQuestion[] = [];

  for (const { category, graded } of examPlan()) {
    if (!graded) {
      throw new Error(`Za mało pytań z poziomami trudności w dziale: ${category.label}`);
    }

    const pool = poolFor(category.id);
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
