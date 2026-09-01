"use client";

import Link from "next/link";
import { useMemo } from "react";
import { categories, plural, questions, questionsWord } from "@/lib/data";
import { useProgress } from "@/lib/progress";
import { Eyebrow } from "@/components/ui";

const hrefFor: Record<string, (id: string) => string> = {
  abc: (id) => `/test?dzialy=${id}`,
  open: (id) => `/fiszki?dzialy=${id}`,
  task: () => "/zadania",
};

const kindLabel: Record<string, string> = {
  abc: "pisemny · ABC",
  open: "ustny · fiszki",
  task: "praktyczny",
};

export function Dzialy() {
  const { store, ready } = useProgress();

  const known = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      if (store.stats[q.id]?.lastOk) counts[q.category] = (counts[q.category] ?? 0) + 1;
    }
    return counts;
  }, [store]);

  return (
    <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <Eyebrow>Działy</Eyebrow>
      <h2 className="optotype mt-3 text-3xl sm:text-4xl">Wybierz, czego się uczysz</h2>

      <ul className="mt-8 grid gap-px overflow-hidden rounded-md border border-ink/12 bg-ink/12 sm:grid-cols-2">
        {categories.map((cat) => {
          const done = ready ? (known[cat.id] ?? 0) : 0;
          const pct = Math.round((done / cat.count) * 100);
          return (
            <li key={cat.id} className="bg-card">
              <Link
                href={hrefFor[cat.kind](cat.id)}
                className="group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-ink/[0.03]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="meta text-ink-faint">{kindLabel[cat.kind]}</span>
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

                <div className="mt-auto pt-3">
                  <div className="h-[3px] w-full bg-ink/10">
                    <div
                      className="h-full bg-duo-green transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="meta mt-2 text-ink-faint">
                    {done > 0 ? `${pct}% opanowane` : "jeszcze nie zaczęte"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
        <li className="bg-card">
          <Link
            href="/test"
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
  );
}
