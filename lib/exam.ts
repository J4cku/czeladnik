import {
  abcCategories,
  abcQuestions,
  type AbcQuestion,
  type Category,
  type Difficulty,
} from "./data";
import { sample, shuffle } from "./rng";

/** Arkusz czeladniczy: 8 pytań z działu, w podziale 3 łatwe / 3 średnie / 2 trudne. */
export const EXAM_PER_CATEGORY = 8;

export const EXAM_SPLIT: { difficulty: Difficulty; count: number }[] = [
  { difficulty: "latwe", count: 3 },
  { difficulty: "srednie", count: 3 },
  { difficulty: "trudne", count: 2 },
];

export type CategoryPlan = {
  category: Category;
  /** Czy arkusz źródłowy ma dla tego działu oznaczenia trudności. */
  graded: boolean;
  available: Record<Difficulty, number>;
};

function poolFor(categoryId: string) {
  return abcQuestions.filter((q) => q.category === categoryId);
}

export function examPlan(): CategoryPlan[] {
  return abcCategories.map((category) => {
    const pool = poolFor(category.id);
    const available = {
      latwe: pool.filter((q) => q.difficulty === "latwe").length,
      srednie: pool.filter((q) => q.difficulty === "srednie").length,
      trudne: pool.filter((q) => q.difficulty === "trudne").length,
    };
    const graded = EXAM_SPLIT.every(({ difficulty, count }) => available[difficulty] >= count);
    return { category, graded, available };
  });
}

export const EXAM_LENGTH = abcCategories.length * EXAM_PER_CATEGORY;

/**
 * Składa arkusz: dział po dziale, w kolejności tematów egzaminu. Tam, gdzie
 * arkusz źródłowy nie oznacza trudności, dobiera 8 pytań losowo z całego działu.
 */
export function buildExam(): AbcQuestion[] {
  const sheet: AbcQuestion[] = [];

  for (const category of abcCategories) {
    const pool = poolFor(category.id);
    const picked: AbcQuestion[] = [];

    for (const { difficulty, count } of EXAM_SPLIT) {
      picked.push(...sample(pool.filter((q) => q.difficulty === difficulty), count));
    }

    if (picked.length < EXAM_PER_CATEGORY) {
      const taken = new Set(picked.map((q) => q.id));
      picked.push(
        ...sample(
          pool.filter((q) => !taken.has(q.id)),
          EXAM_PER_CATEGORY - picked.length,
        ),
      );
    }

    sheet.push(...shuffle(picked));
  }

  return sheet;
}

/** Próg przyjęty w aplikacji dla części pisemnej. */
export const PASS_THRESHOLD = 0.5;
