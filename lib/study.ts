import type { Difficulty } from "./data";
import { sample, shuffle } from "./rng";

export type StudyPick = number | boolean | null;

export function selectStudyCards<T extends { id: string }>(
  cards: readonly T[],
  stats: Record<string, { lastOk: boolean }>,
  size: number,
  freshFirst: boolean,
): T[] {
  const count = size === 0 ? cards.length : Math.min(size, cards.length);
  if (!freshFirst) return sample(cards, count);
  const buckets: T[][] = [[], [], []];
  for (const card of cards) {
    const stat = stats[card.id];
    buckets[!stat ? 0 : stat.lastOk ? 2 : 1].push(card);
  }
  return buckets.flatMap((bucket) => shuffle(bucket)).slice(0, count);
}

export function acceptsStudyShortcut(event: Pick<KeyboardEvent,
  "repeat" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "defaultPrevented" | "target"
>) {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.defaultPrevented) {
    return false;
  }
  return !(typeof Element !== "undefined" && event.target instanceof Element && event.target.closest(
    "button, a, input, textarea, select, summary, [contenteditable]:not([contenteditable='false']), [role='button'], [role='link'], [role='textbox']",
  ));
}

export function canChooseAnswer(pick: StudyPick, exam: boolean) {
  return pick === null || exam;
}

type ScoredQuestion = {
  kind: "abc" | "open";
  answer: number | string;
  category: string;
  difficulty?: Difficulty;
};

export function isStudyCorrect(question: ScoredQuestion, pick: StudyPick) {
  return question.kind === "abc" ? question.answer === pick : pick === true;
}

export function summarizeStudyResults(questions: readonly ScoredQuestion[], picks: readonly StudyPick[]) {
  const perCategory: { category: string; kind: "abc" | "open"; score: number; total: number }[] = [];
  const difficultyResults: { difficulty: Difficulty; score: number; total: number }[] = [];
  let objectiveScore = 0;
  let objectiveTotal = 0;
  let selfAssessedScore = 0;
  let selfAssessedTotal = 0;
  questions.forEach((question, index) => {
    const score = isStudyCorrect(question, picks[index]) ? 1 : 0;
    if (question.kind === "abc") {
      objectiveTotal++;
      objectiveScore += score;
    } else {
      selfAssessedTotal++;
      selfAssessedScore += score;
    }
    let category = perCategory.find((row) => row.category === question.category && row.kind === question.kind);
    if (!category) {
      category = { category: question.category, kind: question.kind, score: 0, total: 0 };
      perCategory.push(category);
    }
    category.total++;
    category.score += score;
    if (question.difficulty) {
      let difficulty = difficultyResults.find((row) => row.difficulty === question.difficulty);
      if (!difficulty) {
        difficulty = { difficulty: question.difficulty, score: 0, total: 0 };
        difficultyResults.push(difficulty);
      }
      difficulty.total++;
      difficulty.score += score;
    }
  });
  return {
    score: objectiveScore + selfAssessedScore,
    total: questions.length,
    objectiveScore, objectiveTotal, selfAssessedScore, selfAssessedTotal,
    perCategory, difficultyResults,
  };
}
