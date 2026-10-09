import { getCatalog, type ExamLevel, type Kind, type Question } from "./data";
import { isWeak, type QuestionStat, type SessionRecord } from "./progress";

export function normalizeLevel(value?: string | null): ExamLevel {
  return value === "mistrz" ? "mistrz" : "czeladnik";
}

export function selectedCategories(level: ExamLevel, kind: Kind, value?: string | null) {
  const categories = getCatalog(level).categories.filter((category) => category.kind === kind);
  const ids = [...new Set((value ?? "").split(","))].filter((id) =>
    categories.some((category) => category.id === id),
  );
  return ids.length ? ids : categories.map((category) => category.id);
}

export function levelQuery(query: string, level: ExamLevel, kind?: Kind) {
  const params = new URLSearchParams(query);
  params.set("poziom", level);
  const ids = (params.get("dzialy") ?? "").split(",").filter((id) => {
    const category = getCatalog(level).categoryById.get(id);
    return category && (!kind || category.kind === kind);
  });
  if (ids.length) params.set("dzialy", [...new Set(ids)].join(","));
  else params.delete("dzialy");
  return params.toString();
}

export function levelProgress(level: ExamLevel, stats: Record<string, QuestionStat>) {
  const catalog = getCatalog(level);
  const own = catalog.questions.flatMap((question) =>
    stats[question.id] ? [stats[question.id]] : [],
  );
  const abc = summarize(catalog.abcQuestions, stats);
  return {
    answered: own.length,
    weak: catalog.abcQuestions.filter((question) => isWeak(stats[question.id])).length,
    accuracy: abc.accuracy ?? 0,
  };
}

function summarize(questions: Question[], stats: Record<string, QuestionStat>) {
  const own = questions.flatMap((question) => stats[question.id] ? [stats[question.id]] : []);
  const ok = own.reduce((sum, stat) => sum + stat.ok, 0);
  const attempts = own.reduce((sum, stat) => sum + stat.ok + stat.bad, 0);
  return {
    total: questions.length,
    answered: own.length,
    attempts,
    accuracy: attempts ? Math.round(ok / attempts * 100) : null,
    weak: questions.filter((question) => isWeak(stats[question.id])).length,
  };
}

export function studyProgress(level: ExamLevel, stats: Record<string, QuestionStat>) {
  const catalog = getCatalog(level);
  return {
    ...summarize(catalog.questions.filter((question) => question.kind !== "task"), stats),
    abc: summarize(catalog.abcQuestions, stats),
    open: summarize(catalog.openQuestions, stats),
    difficulties: {
      latwe: summarize(catalog.abcQuestions.filter((question) => question.difficulty === "latwe"), stats),
      srednie: summarize(catalog.abcQuestions.filter((question) => question.difficulty === "srednie"), stats),
      trudne: summarize(catalog.abcQuestions.filter((question) => question.difficulty === "trudne"), stats),
    },
  };
}

export function recentSessions(level: ExamLevel, history: SessionRecord[]) {
  const ids = new Set(getCatalog(level).categories.map((category) => category.id));
  return history.filter((session) => session.level
    ? session.level === level
    : session.categories.length > 0 && session.categories.every((id) => ids.has(id)),
  ).slice(0, 5);
}
