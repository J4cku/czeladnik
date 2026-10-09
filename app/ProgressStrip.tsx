"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProgress } from "@/lib/progress";
import { questionsWord, type ExamLevel } from "@/lib/data";
import { levelProgress } from "@/lib/exam-level";
import { Btn } from "@/components/ui";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="optotype text-3xl sm:text-5xl">{value}</p>
      <p className="meta mt-2 text-[10px] leading-snug text-ink-faint sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

export function ProgressStrip({ level }: { level: ExamLevel }) {
  const { store, ready, reset } = useProgress();

  const summary = useMemo(() => levelProgress(level, store.stats), [level, store]);

  if (!ready || summary.answered === 0) return null;

  return (
    <section className="border-y rule bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-14">
          <Stat value={String(summary.answered)} label="poznanych pytań" />
          <Stat value={`${summary.accuracy}%`} label="trafnych odpowiedzi" />
          <Stat value={String(summary.weak)} label="do powtórki" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {summary.weak > 0 && (
            <Link
              href={`/test?poziom=${level}&tryb=bledne`}
              className="ui inline-flex items-center gap-2 rounded-full bg-duo-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-duo-red/88"
            >
              Powtórz {summary.weak} {questionsWord(summary.weak)}
            </Link>
          )}
          <Btn
            variant="quiet"
            className="px-3"
            onClick={() => {
              if (confirm("Wyczyścić zapisane postępy? Tej operacji nie da się cofnąć.")) {
                reset();
              }
            }}
          >
            Wyczyść postępy
          </Btn>
        </div>
      </div>
    </section>
  );
}
