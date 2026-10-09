"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useProgress } from "@/lib/progress";
import { difficultyLabel, questionsWord, type ExamLevel } from "@/lib/data";
import { recentSessions, studyProgress } from "@/lib/exam-level";
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

export function ProgressRepeat({ level, count }: { level: ExamLevel; count: number }) {
  if (count === 0) return null;
  return (
    <Link
      href={`/test?poziom=${level}&tryb=bledne`}
      className="ui inline-flex items-center gap-2 rounded-full bg-duo-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-duo-red/88"
    >
      Powtórz {count} {questionsWord(count)} ABC
    </Link>
  );
}

export function ProgressReset({ onReset }: { onReset: () => void }) {
  return (
    <Btn
      variant="quiet"
      className="px-3"
      onClick={() => {
        if (confirm("Wyczyścić postępy Czeladnika i Mistrza? Tej operacji nie da się cofnąć.")) {
          onReset();
        }
      }}
    >
      Wyczyść postępy: Czeladnik i Mistrz
    </Btn>
  );
}

export function ProgressStrip({ level }: { level: ExamLevel }) {
  const { store, ready, reset } = useProgress();

  const summary = useMemo(() => studyProgress(level, store.stats), [level, store]);
  const history = useMemo(() => recentSessions(level, store.history), [level, store]);

  if (!ready || summary.answered === 0) return null;

  return (
    <section className="border-y rule bg-card">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <Stat value={`${summary.answered}/${summary.total}`} label="pytań przećwiczonych" />
          <Stat value={summary.abc.accuracy === null ? "—" : `${summary.abc.accuracy}%`} label={`trafność ABC · ${summary.abc.attempts} odpowiedzi`} />
          <Stat value={summary.open.accuracy === null ? "—" : `${summary.open.accuracy}%`} label={`samoocena fiszek i rysunków · ${summary.open.attempts} odpowiedzi`} />
        </div>
        <p className="mt-4 text-sm text-ink-soft">Trafność ABC obejmuje wszystkie próby, także powtórki. Samoocena jest liczona osobno.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ProgressRepeat level={level} count={summary.abc.weak} />
          {summary.open.weak > 0 && (
            <Link href={`/fiszki?poziom=${level}&tryb=bledne`} className="ui rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold">
              Powtórz {summary.open.weak} {questionsWord(summary.open.weak)} otwartych
            </Link>
          )}
          <ProgressReset onReset={reset} />
        </div>
        <details className="mt-8 border-t rule pt-4">
          <summary className="ui cursor-pointer text-sm font-semibold">Trudność ABC i ostatnie sesje</summary>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {Object.entries(summary.difficulties).map(([difficulty, result]) => (
              <li key={difficulty} className="text-sm">
                <span className="ui font-semibold">{difficultyLabel[difficulty as keyof typeof difficultyLabel]}: </span>
                {result.accuracy === null ? "brak odpowiedzi" : `${result.accuracy}% · ${result.attempts} odpowiedzi`}
                <p className="mt-1 text-ink-soft">Przećwiczone: {result.answered}/{result.total}</p>
              </li>
            ))}
          </ul>
          {history.length > 0 && (
            <ul className="mt-6 divide-y divide-ink/10">
              {history.map((session, index) => (
                <li key={`${session.ts}-${index}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span>
                    {new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(session.ts)}
                    {" · "}
                    {session.mode === "exam" ? "Test bez podpowiedzi" : session.mode === "retry" ? "Powtórka błędów" : session.mode === "oral" ? "Zestaw ustny · samoocena" : session.mode === "flashcards" ? "Fiszki · samoocena" : session.mode === "practice" ? "Nauka ABC" : "Starsza sesja"}
                  </span>
                  <span className="font-mono">
                    {session.objectiveTotal && session.selfAssessedTotal
                      ? `${session.objectiveScore}/${session.objectiveTotal} ABC · ${session.selfAssessedScore}/${session.selfAssessedTotal} samoocena`
                      : `${session.score}/${session.total}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </details>
      </div>
    </section>
  );
}
