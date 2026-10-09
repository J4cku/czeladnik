import { getCatalog, type ExamLevel, type Kind } from "./data";
import { isWeak, type QuestionStat } from "./progress";

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
  const ok = own.reduce((sum, stat) => sum + stat.ok, 0);
  const total = own.reduce((sum, stat) => sum + stat.ok + stat.bad, 0);
  return {
    answered: own.length,
    weak: catalog.abcQuestions.filter((question) => isWeak(stats[question.id])).length,
    accuracy: total ? Math.round((ok / total) * 100) : 0,
  };
}
