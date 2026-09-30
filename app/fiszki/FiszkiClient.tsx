"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  categoryById,
  openCategories,
  openQuestions,
  questionsWord,
  type OpenQuestion,
} from "@/lib/data";
import { sample } from "@/lib/rng";
import { recordAnswer, useProgress } from "@/lib/progress";
import { Btn, Eyebrow, LinkBtn } from "@/components/ui";
import { QuestionMeta } from "@/components/QuestionMeta";

type Stage = "setup" | "running" | "done";

const SIZES = [10, 20, 0] as const;

export default function FiszkiClient() {
  const params = useSearchParams();
  const { store, ready } = useProgress();

  // Deep link: /fiszki?dzialy=ustny-technologia
  const [selected, setSelected] = useState<string[]>(() => {
    const ids = (params.get("dzialy") ?? "")
      .split(",")
      .filter((id) => categoryById.get(id)?.kind === "open");
    return ids.length ? ids : openCategories.map((c) => c.id);
  });
  const [size, setSize] = useState<number>(10);
  const [freshFirst, setFreshFirst] = useState(true);

  const [stage, setStage] = useState<Stage>("setup");
  const [deck, setDeck] = useState<OpenQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [known, setKnown] = useState<boolean[]>([]);

  const pool = useMemo(
    () => openQuestions.filter((q) => selected.includes(q.category)),
    [selected],
  );

  const start = useCallback(
    (cards: OpenQuestion[]) => {
      setDeck(cards);
      setIndex(0);
      setShown(false);
      setKnown([]);
      setStage(cards.length ? "running" : "setup");
    },
    [],
  );

  const build = useCallback(() => {
    // "Najpierw nieopanowane" pulls unseen and previously-missed cards to the front.
    const ranked = freshFirst
      ? [...pool].sort((a, b) => rank(a) - rank(b))
      : pool;
    const count = size === 0 ? ranked.length : Math.min(size, ranked.length);
    const head = freshFirst ? ranked.slice(0, Math.max(count * 2, count)) : ranked;
    start(sample(head, count));

    function rank(q: OpenQuestion) {
      const stat = store.stats[q.id];
      if (!stat) return 0;
      return stat.lastOk ? 2 : 1;
    }
  }, [pool, size, freshFirst, store, start]);

  const grade = useCallback(
    (ok: boolean) => {
      const card = deck[index];
      recordAnswer(card.id, ok);
      const nextKnown = [...known, ok];
      setKnown(nextKnown);
      setShown(false);
      if (index + 1 < deck.length) setIndex(index + 1);
      else setStage("done");
    },
    [deck, index, known],
  );

  useEffect(() => {
    if (stage !== "running") return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
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
  }, [stage, shown, grade]);

  if (stage === "setup") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Eyebrow>Część ustna</Eyebrow>
        <h1 className="optotype mt-3 text-4xl sm:text-5xl">Złóż talię</h1>
        <p className="mt-4 max-w-xl text-ink-soft">
          Przeczytaj pytanie, odpowiedz na głos, dopiero potem odsłoń wzorcową
          odpowiedź i oceń się sam.
        </p>

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
              Najpierw nieopanowane
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Btn variant="accent" className="px-7 py-3 text-base" disabled={!pool.length} onClick={build}>
            Losuj fiszki
          </Btn>
          <p className="text-sm text-ink-soft">
            {pool.length
              ? `${pool.length} ${questionsWord(pool.length)} w wybranych działach.`
              : "Wybierz przynajmniej jeden dział."}
          </p>
        </div>

        {ready && selected.includes("rysunek") && (
          <p className="mt-8 border-l-2 border-amber pl-4 text-sm leading-relaxed text-ink-soft">
            Dział „Rysunek zawodowy” odsyła do rysunków z arkusza egzaminacyjnego.
            Zamiast obrazka znajdziesz tu opis prawidłowej odpowiedzi.
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

          {shown ? (
            <>
              <div className="resolve surface mt-8 rounded-md p-5 sm:p-6">
                <Eyebrow className="mb-3">Wzorcowa odpowiedź</Eyebrow>
                <p className="text-[15.5px] leading-[1.75] sm:text-base">{card.answer}</p>
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
      <Eyebrow>Talia przerobiona</Eyebrow>
      <div className="resolve mt-4 flex flex-wrap items-baseline gap-x-6 border-b rule pb-6">
        <p className="optotype text-[clamp(3.5rem,16vw,7rem)]">
          {okCount}
          <span className="text-ink-faint">/{deck.length}</span>
        </p>
        <p className="optotype text-3xl text-flash">umiem</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {repeats.length > 0 && (
          <Btn variant="accent" onClick={() => start(repeats)}>
            Powtórz {repeats.length} {plural(repeats.length)}
          </Btn>
        )}
        <Btn variant="ghost" onClick={() => setStage("setup")}>
          Nowa talia
        </Btn>
        <LinkBtn href="/" variant="quiet" className="px-3">
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
