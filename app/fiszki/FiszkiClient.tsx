"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCatalog,
  questionsWord,
  type OpenQuestion,
} from "@/lib/data";
import { buildOralExam, oralExamPlan, ORAL_EXAM_LENGTH } from "@/lib/oral-exam";
import { isWeak, recordAnswer, recordSession, useProgress } from "@/lib/progress";
import { Btn, Eyebrow, LinkBtn } from "@/components/ui";
import { QuestionMeta } from "@/components/QuestionMeta";
import { QuestionImage } from "@/components/QuestionImage";
import { QuestionAnswer } from "@/components/QuestionAnswer";
import { ExamLevelToggle } from "@/components/ExamLevelToggle";
import { levelQuery, normalizeLevel, selectedCategories } from "@/lib/exam-level";
import { acceptsStudyShortcut, selectStudyCards, summarizeStudyResults } from "@/lib/study";

type Stage = "setup" | "running" | "done";

const SIZES = [10, 20, 0] as const;

export default function FiszkiClient() {
  const params = useSearchParams();
  return <LevelFiszki key={params.toString()} query={params.toString()} />;
}

function LevelFiszki({ query }: { query: string }) {
  const params = new URLSearchParams(query);
  const level = normalizeLevel(params.get("poziom"));
  const { openCategories, openQuestions, categoryById } = getCatalog(level);
  const { store, ready } = useProgress();
  const [oralExam, setOralExam] = useState(() => params.get("egzamin") === "1");
  const [onlyWeak, setOnlyWeak] = useState(() => params.get("tryb") === "bledne");
  const oralPlan = oralExamPlan(level);
  const oralAvailable = oralPlan.every(({ available }) =>
    Object.values(available).every((count) => count >= 1),
  );

  // Deep link: /fiszki?dzialy=ustny-technologia
  const [selected, setSelected] = useState<string[]>(() => selectedCategories(level, "open", params.get("dzialy")));
  const [size, setSize] = useState<number>(10);
  const [freshFirst, setFreshFirst] = useState(true);

  const [stage, setStage] = useState<Stage>("setup");
  const [deck, setDeck] = useState<OpenQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [known, setKnown] = useState<boolean[]>([]);
  const [sessionMode, setSessionMode] = useState<"oral" | "flashcards" | "retry">("flashcards");

  const pool = openQuestions.filter((q) => selected.includes(q.category) && (!onlyWeak || isWeak(store.stats[q.id])));

  const start = useCallback(
    (cards: OpenQuestion[], retry = false) => {
      setDeck(cards);
      setIndex(0);
      setShown(false);
      setKnown([]);
      setSessionMode(retry ? "retry" : oralExam ? "oral" : "flashcards");
      setStage(cards.length ? "running" : "setup");
    },
    [oralExam],
  );

  function build() {
    if (oralExam) {
      start(buildOralExam(level));
      return;
    }
    start(selectStudyCards(pool, store.stats, size, freshFirst), onlyWeak);
  }

  function grade(ok: boolean) {
    const card = deck[index];
    recordAnswer(card.id, ok);
    const nextKnown = [...known, ok];
    setKnown(nextKnown);
    setShown(false);
    if (index + 1 < deck.length) setIndex(index + 1);
    else {
      recordSession({
        ...summarizeStudyResults(deck, nextKnown),
        categories: [...new Set(deck.map((question) => question.category))],
        level,
        mode: sessionMode,
      });
      setStage("done");
    }
  }

  useEffect(() => {
    if (stage !== "running") return;
    function onKey(e: KeyboardEvent) {
      if (!acceptsStudyShortcut(e)) return;
      const key = e.key.toLowerCase();
      if (!shown && (key === " " || key === "enter")) {
        e.preventDefault();
        setShown(true);
      } else if (shown && (key === "u" || key === "1")) {
        e.preventDefault();
        grade(true);
      } else if (shown && (key === "p" || key === "2")) {
        e.preventDefault();
        grade(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (stage === "setup") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Eyebrow>{oralExam ? "Część ustna" : "Odpowiedzi otwarte · samoocena"}</Eyebrow>
        <h1 className="optotype mt-3 text-4xl sm:text-5xl">
          {oralExam ? "Egzamin ustny" : "Złóż talię"}
        </h1>
        <p className="mt-4 max-w-xl text-ink-soft">
          Przeczytaj pytanie, odpowiedz na głos, dopiero potem odsłoń źródłową
          odpowiedź i oceń się sam.
        </p>

        <div className="border-b rule py-6">
          <Eyebrow className="mb-3">Poziom egzaminu</Eyebrow>
          <ExamLevelToggle level={level} onChange={(next) => {
            const mode = new URLSearchParams(query);
            if (oralExam) mode.set("egzamin", "1");
            else mode.delete("egzamin");
            if (onlyWeak) mode.set("tryb", "bledne");
            else mode.delete("tryb");
            window.history.pushState(null, "", `?${levelQuery(mode.toString(), next, "open")}`);
          }} />
        </div>

        <div className="flex flex-wrap gap-2 border-b rule py-6" aria-label="Tryb ćwiczenia">
          {[
            { exam: false, label: "Własna talia" },
            { exam: true, label: "Egzamin ustny" },
          ].map(({ exam, label }) => (
            <button
              key={label}
              aria-pressed={oralExam === exam}
              onClick={() => {
                setOralExam(exam);
                if (exam) setOnlyWeak(false);
              }}
              className={`ui rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                oralExam === exam
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 bg-card text-ink-soft hover:border-ink/45 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {oralExam ? (
          <div className="border-b rule py-6">
            <Eyebrow className="mb-3">Skład zestawu · {ORAL_EXAM_LENGTH} pytań</Eyebrow>
            <p className="text-sm leading-relaxed text-ink-soft">
              Z każdego działu po 1 pytaniu łatwym, średnim i trudnym.
              Taki sam skład obowiązuje czeladnika i mistrza.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {oralPlan.map(({ category }) => (
                <li key={category.id} className="flex justify-between gap-4">
                  <span>{category.label}</span>
                  <span className="font-mono text-ink-faint">1 Ł / 1 Ś / 1 T</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b rule py-5">
              <button
                aria-pressed={onlyWeak}
                onClick={() => setOnlyWeak(!onlyWeak)}
                className={`ui rounded-full border px-4 py-2 text-[13px] font-medium ${onlyWeak ? "border-flash bg-flash text-white" : "border-ink/20 bg-card text-ink-soft"}`}
              >
                Tylko do powtórki
              </button>
              {onlyWeak && (
                <p className="text-sm text-ink-soft">
                  {!ready ? "Wczytuję postępy…" : pool.length ? `${pool.length} fiszek z ostatnią oceną „do powtórki”.` : "Brak fiszek do powtórki w wybranych działach. Wyłącz filtr lub wybierz inne działy."}
                </p>
              )}
            </div>
            <div className="border-b rule py-6">
              <Eyebrow className="mb-3">Działy</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {openCategories.map((cat) => {
                  const active = selected.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      aria-pressed={active}
                      onClick={() =>
                        setSelected(
                          active
                            ? selected.filter((id) => id !== cat.id)
                            : [...selected, cat.id],
                        )
                      }
                      className={`ui rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/20 bg-card text-ink-soft hover:border-ink/45 hover:text-ink"
                      }`}
                    >
                      {cat.label}
                      <span className="ml-2 font-mono text-[11px] opacity-60">{cat.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-b rule py-6">
              <Eyebrow className="mb-3">Ile fiszek</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((n) => (
                  <button
                    key={n}
                    aria-pressed={size === n}
                    onClick={() => setSize(n)}
                    className={`ui rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                      size === n
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/20 bg-card text-ink-soft hover:border-ink/45 hover:text-ink"
                    }`}
                  >
                    {n === 0 ? "wszystkie" : n}
                  </button>
                ))}
                <button
                  aria-pressed={freshFirst}
                  onClick={() => setFreshFirst(!freshFirst)}
                  className={`ui rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                    freshFirst
                      ? "border-flash bg-flash text-white"
                      : "border-ink/20 bg-card text-ink-soft hover:border-ink/45 hover:text-ink"
                  }`}
                >
                  Najpierw nowe i do powtórki
                </button>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Btn
            variant="accent"
            className="px-7 py-3 text-base"
            disabled={oralExam ? !oralAvailable : !pool.length || (onlyWeak && !ready)}
            onClick={build}
          >
            {oralExam ? "Losuj egzamin ustny" : "Losuj fiszki"}
          </Btn>
          <p className="text-sm text-ink-soft">
            {oralExam
              ? oralAvailable
                ? `${ORAL_EXAM_LENGTH} pytań · samoocena odpowiedzi.`
                : "Brakuje pytań do pełnego zestawu ustnego."
              : pool.length
                ? `${pool.length} ${questionsWord(pool.length)} w wybranych działach.`
                : "Wybierz przynajmniej jeden dział."}
          </p>
        </div>

        {!oralExam && selected.includes("rysunek") && (
          <p className="mt-8 border-l-2 border-amber pl-4 text-sm leading-relaxed text-ink-soft">
            W dziale „Rysunek zawodowy” oglądasz rysunek, odkrywasz odpowiedź źródłową i oceniasz się sam.
          </p>
        )}
      </main>
    );
  }

  if (stage === "running") {
    const card = deck[index];
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-3xl flex-col px-5 py-8 sm:px-8">
        <div className="flex items-center gap-4">
          <span className="meta text-ink-faint">
            {String(index + 1).padStart(2, "0")} / {String(deck.length).padStart(2, "0")}
          </span>
          <div className="h-[3px] flex-1 bg-ink/12">
            <div
              className="h-full bg-ink transition-[width] duration-300"
              style={{ width: `${(index / deck.length) * 100}%` }}
            />
          </div>
          <button onClick={() => setStage("setup")} className="meta text-ink-faint hover:text-ink">
            przerwij
          </button>
        </div>

        <article key={card.id} className="resolve flex flex-1 flex-col justify-center py-10">
          <QuestionMeta
            category={categoryById.get(card.category)?.label}
            difficulty={card.difficulty}
          />
          <h1 className="mt-4 font-body text-[1.5rem] leading-snug font-medium sm:text-[1.9rem]">
            {card.prompt}
          </h1>

          {card.image && <div className="mt-6"><QuestionImage image={card.image} alt={`Rysunek do pytania: ${card.prompt}`} /></div>}

          {shown ? (
            <>
              <div className="resolve surface mt-8 rounded-md p-5 sm:p-6">
                <QuestionAnswer question={card} />
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => grade(true)}
                  className="ui rounded-full bg-duo-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-duo-green/88"
                >
                  Umiem
                </button>
                <button
                  onClick={() => grade(false)}
                  className="ui rounded-full bg-duo-red px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-duo-red/88"
                >
                  Do powtórki
                </button>
                <p className="meta ml-1 text-ink-faint">klawisze U i P</p>
              </div>
            </>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Btn variant="solid" className="px-6" onClick={() => setShown(true)}>
                Pokaż odpowiedź
              </Btn>
              <p className="meta text-ink-faint">spacja</p>
            </div>
          )}
        </article>
      </main>
    );
  }

  const okCount = known.filter(Boolean).length;
  const repeats = deck.filter((_, i) => !known[i]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Eyebrow>{oralExam ? "Zestaw ustny przerobiony" : "Talia przerobiona"}</Eyebrow>
      <div className="resolve mt-4 flex flex-wrap items-baseline gap-x-6 border-b rule pb-6">
        <p className="optotype text-[clamp(3.5rem,16vw,7rem)]">
          {okCount}
          <span className="text-ink-faint">/{deck.length}</span>
        </p>
        <p className="optotype text-3xl text-flash">umiem</p>
      </div>
      <p className="mt-4 text-sm text-ink-soft">Wynik samooceny odpowiedzi otwartych.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {repeats.length > 0 && (
          <Btn variant="accent" onClick={() => start(repeats, true)}>
            Powtórz {repeats.length} {plural(repeats.length)}
          </Btn>
        )}
        <Btn variant="ghost" onClick={() => setStage("setup")}>
          {oralExam ? "Nowy zestaw ustny" : "Nowa talia"}
        </Btn>
        <LinkBtn href={`/?poziom=${level}`} variant="quiet" className="px-3">
          Strona główna
        </LinkBtn>
      </div>

      {repeats.length > 0 && (
        <section className="mt-14">
          <Eyebrow>Do powtórki</Eyebrow>
          <ul className="mt-5 space-y-4">
            {repeats.map((card) => (
              <li key={card.id} className="border-b rule pb-4">
                <p className="meta text-ink-faint">
                  {categoryById.get(card.category)?.label}
                </p>
                <p className="mt-1.5 text-[16px] leading-snug">{card.prompt}</p>
                {card.image && <div className="mt-4"><QuestionImage image={card.image} alt={`Rysunek do pytania: ${card.prompt}`} /></div>}
                <div className="mt-4"><QuestionAnswer question={card} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function plural(n: number) {
  return n === 1 ? "fiszkę" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "fiszki" : "fiszek";
}
