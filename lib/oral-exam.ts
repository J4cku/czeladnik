import {
  getCatalog,
  type Category,
  type Difficulty,
  type ExamLevel,
  type OpenQuestion,
} from "./data";
import { sample, shuffle } from "./rng";

export const ORAL_CATEGORY_IDS = [
  "ustny-technologia",
  "ustny-materialy",
  "ustny-maszyny",
] as const;

const ORAL_DIFFICULTIES: Difficulty[] = ["latwe", "srednie", "trudne"];

export const ORAL_EXAM_LENGTH = ORAL_CATEGORY_IDS.length * ORAL_DIFFICULTIES.length;

export type OralCategoryPlan = {
  category: Category;
  available: Record<Difficulty, number>;
};

export function oralExamPlan(level: ExamLevel = "czeladnik"): OralCategoryPlan[] {
  const { categoryById, openQuestions } = getCatalog(level);
  return ORAL_CATEGORY_IDS.map((id) => {
    const categoryId = level === "mistrz" ? `mistrz-${id}` : id;
    const category = categoryById.get(categoryId);
    if (!category) throw new Error(`Brak działu ustnego: ${categoryId}`);
    const pool = openQuestions.filter((question) => question.category === categoryId);
    return {
      category,
      available: {
        latwe: pool.filter((question) => question.difficulty === "latwe").length,
        srednie: pool.filter((question) => question.difficulty === "srednie").length,
        trudne: pool.filter((question) => question.difficulty === "trudne").length,
      },
    };
  });
}

export function buildOralExam(level: ExamLevel = "czeladnik"): OpenQuestion[] {
  const { openQuestions } = getCatalog(level);
  return oralExamPlan(level).flatMap(({ category, available }) => {
    for (const difficulty of ORAL_DIFFICULTIES) {
      if (available[difficulty] < 1) {
        throw new Error(`Brak pytań ${difficulty} w dziale: ${category.label}`);
      }
    }

    const pool = openQuestions.filter((question) => question.category === category.id);
    return shuffle(
      ORAL_DIFFICULTIES.flatMap((difficulty) =>
        sample(
          pool.filter((question) => question.difficulty === difficulty),
          1,
        ),
      ),
    );
  });
}
