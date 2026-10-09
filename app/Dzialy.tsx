"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCatalog, plural, questionsWord, type ExamLevel } from "@/lib/data";
import { useProgress } from "@/lib/progress";
import { Eyebrow, LinkBtn } from "@/components/ui";
import { ExamLevelToggle } from "@/components/ExamLevelToggle";
import { levelQuery, normalizeLevel } from "@/lib/exam-level";
import { ProgressStrip } from "./ProgressStrip";

const hrefFor: Record<string, (id: string, level: ExamLevel) => string> = {
  abc: (id, level) => `/test?poziom=${level}&dzialy=${id}`,
  open: (id, level) => `/fiszki?poziom=${level}&dzialy=${id}`,
  task: () => "/zadania",
};

const kindLabel: Record<string, string> = {
  abc: "pisemny · ABC",
  open: "ustny · fiszki",
  task: "praktyczny · Czeladnik",
};

export function StudyLinks() {
  const params = useSearchParams();
  const level = normalizeLevel(params.get("poziom"));
  return (
    <div className="resolve resolve-4 mt-8">
      <ExamLevelToggle level={level} onChange={(next) => {
        window.history.pushState(null, "", `?${levelQuery(params.toString(), next)}`);
      }} />
      <div className="mt-5 flex flex-wrap items-center gap-3">
      <LinkBtn href={`/test?poziom=${level}`} variant="accent" className="px-6 py-3 text-base">Losuj test ABC</LinkBtn>
      <LinkBtn href={`/test?poziom=${level}&arkusz=1`} variant="ghost">Arkusz egzaminacyjny</LinkBtn>
      <LinkBtn href={`/fiszki?poziom=${level}`} variant="ghost">Fiszki i rysunki</LinkBtn>
      <LinkBtn href={`/fiszki?poziom=${level}&egzamin=1`} variant="ghost">Egzamin ustny · 9 pytań</LinkBtn>
      <LinkBtn href="/zadania" variant="ghost">Zadania praktyczne · Czeladnik</LinkBtn>
      </div>
    </div>
  );
}

export function Dzialy() {
  const params = useSearchParams();
  const level = normalizeLevel(params.get("poziom"));
  const { categories, questions } = getCatalog(level);
  const { store, ready } = useProgress();

  const known = (() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      if (store.stats[q.id]?.lastOk) counts[q.category] = (counts[q.category] ?? 0) + 1;
    }
    return counts;
  })();

  return (
    <>
    <ProgressStrip level={level} />
    <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <Eyebrow>Działy</Eyebrow>
      <h2 className="optotype mt-3 text-3xl sm:text-4xl">Wybierz, czego się uczysz</h2>
      <div className="mt-6">
        <ExamLevelToggle level={level} onChange={(next) => {
          window.history.pushState(null, "", `?${levelQuery(params.toString(), next)}`);
        }} />
      </div>

      <ul className="mt-8 grid gap-px overflow-hidden rounded-md border border-ink/12 bg-ink/12 sm:grid-cols-2">
        {categories.map((cat) => {
          const done = ready ? (known[cat.id] ?? 0) : 0;
          const pct = Math.round((done / cat.count) * 100);
          const attempted = ready && questions.some((question) => question.category === cat.id && store.stats[question.id]?.seen > 0);
          return (
            <li key={cat.id} className="bg-card">
              <Link
                href={hrefFor[cat.kind](cat.id, level)}
                className="group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-ink/[0.03]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="meta text-ink-faint">{cat.id === "rysunek" ? "pisemny · odpowiedź otwarta" : kindLabel[cat.kind]}</span>
                  <span className="meta text-ink-faint">
                    {cat.count}{" "}
                    {cat.kind === "task"
                      ? plural(cat.count, "zadanie", "zadania", "zadań")
                      : questionsWord(cat.count)}
                  </span>
                </div>

                <h3 className="ui text-lg font-bold transition-colors group-hover:text-flash">
                  {cat.label}
                </h3>
                <p className="text-[14px] leading-relaxed text-ink-soft">
                  {cat.description}
                </p>

                {cat.kind !== "task" && <div className="mt-auto pt-3">
                  <div className="h-[3px] w-full bg-ink/10">
                    <div
                      className="h-full bg-duo-green transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="meta mt-2 text-ink-faint">
                    {attempted ? `${pct}% ostatnio poprawne` : "jeszcze nie zaczęte"}
                  </p>
                </div>}
              </Link>
            </li>
          );
        })}
        <li className="bg-card">
          <Link
            href={`/test?poziom=${level}`}
            className="group flex h-full flex-col justify-center gap-2 p-5 transition-colors hover:bg-ink/[0.03]"
          >
            <span className="meta text-ink-faint">Bez wybierania</span>
            <h3 className="ui text-lg font-bold transition-colors group-hover:text-flash">
              Losuj ze wszystkich działów
            </h3>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              20 pytań ABC z całego materiału pisemnego.
            </p>
          </Link>
        </li>
      </ul>
    </section>
    </>
  );
}
