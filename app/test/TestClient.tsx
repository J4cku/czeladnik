"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  abcCategories,
  abcQuestions,
  categoryById,
  difficultyLabel,
  LETTERS,
  questionsWord,
  type AbcQuestion,
} from "@/lib/data";
import { sample, shuffle } from "@/lib/rng";
import { isWeak, recordAnswer, recordSession, useProgress } from "@/lib/progress";
import { Btn, Eyebrow, LinkBtn } from "@/components/ui";

type Item = { q: AbcQuestion; order: number[] };
type Stage = "setup" | "running" | "done";

const LENGTHS = [10, 20, 40, 0] as const;
const lengthLabel = (n: number) => (n === 0 ? "wszystkie" : String(n));

export default function TestClient() {
  const params = useSearchParams();
  const { store, ready } = useProgress();

  // Deep links: /test?dzialy=bhp,prawo-pracy or /test?tryb=bledne
  const [selected, setSelected] = useState<string[]>(() => {
    const ids = (params.get("dzialy") ?? "")
      .split(",")
      .filter((id) => categoryById.get(id)?.kind === "abc");
    return ids.length ? ids : abcCategories.map((c) => c.id);
  });
  const [length, setLength] = useState<number>(20);
  const [exam, setExam] = useState(false);
  const [onlyWeak, setOnlyWeak] = useState(() => params.get("tryb") === "bledne");

  const [stage, setStage] = useState<Stage>("setup");
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>([]);

  const weakIds = useMemo(() => {
    const set = new Set<string>();
    for (const q of abcQuestions) if (isWeak(store.stats[q.id])) set.add(q.id);
    return set;
  }, [store]);

  const pool = useMemo(
    () =>
      abcQuestions.filter(
        (q) => selected.includes(q.category) && (!onlyWeak || weakIds.has(q.id)),
      ),
    [selected, onlyWeak, weakIds],
  );

  const start = useCallback(
    (questions: AbcQuestion[], count: number) => {
      const picked = sample(questions, count > 0 ? count : questions.length);
      setItems(picked.map((q) => ({ q, order: shuffle([0, 1, 2]) })));
      setPicks(new Array(picked.length).fill(null));
      setIndex(0);
      setStage("running");
    },
    [],
  );

  const finish = useCallback(
    (finalPicks: (number | null)[], list: Item[]) => {
      const score = list.reduce(
        (sum, item, i) => sum + (finalPicks[i] === item.q.answer ? 1 : 0),
        0,
      );
      recordSession({ score, total: list.length, categories: selected });
      setStage("done");
    },
    [selected],
  );

  if (stage === "setup") {
    return (
      <Setup
        selected={selected}
        setSelected={setSelected}
        length={length}
        setLength={setLength}
        exam={exam}
        setExam={setExam}
        onlyWeak={onlyWeak}
        setOnlyWeak={setOnlyWeak}
        poolSize={pool.length}
        weakSize={ready ? weakIds.size : 0}
        onStart={() => start(pool, length)}
      />
    );
  }

  if (stage === "running") {
    return (
      <Runner
        items={items}
        index={index}
        picks={picks}
        exam={exam}
        onPick={(optionIndex) =>
          setPicks((prev) => {
            const next = prev.slice();
            next[index] = optionIndex;
            return next;
          })
        }
        onNext={() => {
          const pick = picks[index];
          const item = items[index];
          if (pick === null) return;
          recordAnswer(item.q.id, pick === item.q.answer);
          if (index + 1 < items.length) setIndex(index + 1);
          else finish(picks, items);
        }}
        onAbort={() => setStage("setup")}
      />
    );
  }

  return (
    <Summary
      items={items}
      picks={picks}
      onRetryWrong={() => {
        const wrong = items
          .filter((item, i) => picks[i] !== item.q.answer)
          .map((item) => item.q);
        start(wrong, wrong.length);
      }}
      onNewTest={() => setStage("setup")}
    />
  );
}

/* ---------------------------------------------------------------- setup */

function Toggle({
  active,
  children,
  ...props
}: React.ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      {...props}
      aria-pressed={active}
      className={`ui rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/20 bg-card text-ink-soft hover:border-ink/45 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b rule py-6">
      <Eyebrow className="mb-3">{label}</Eyebrow>
      {children}
    </div>
  );
}

function Setup({
  selected,
  setSelected,
  length,
  setLength,
  exam,
  setExam,
  onlyWeak,
  setOnlyWeak,
  poolSize,
  weakSize,
  onStart,
}: {
  selected: string[];
  setSelected: (v: string[]) => void;
  length: number;
  setLength: (v: number) => void;
  exam: boolean;
  setExam: (v: boolean) => void;
  onlyWeak: boolean;
  setOnlyWeak: (v: boolean) => void;
  poolSize: number;
  weakSize: number;
  onStart: () => void;
}) {
  const all = selected.length === abcCategories.length;
  const planned = length === 0 ? poolSize : Math.min(length, poolSize);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Eyebrow>Część pisemna</Eyebrow>
      <h1 className="optotype mt-3 text-4xl sm:text-5xl">Ustaw test</h1>

      <Field label="Działy">
        <div className="flex flex-wrap gap-2">
          {abcCategories.map((cat) => (
            <Toggle
              key={cat.id}
              active={selected.includes(cat.id)}
              onClick={() =>
                setSelected(
                  selected.includes(cat.id)
                    ? selected.filter((id) => id !== cat.id)
                    : [...selected, cat.id],
                )
              }
            >
              {cat.label}
              <span className="ml-2 font-mono text-[11px] opacity-60">{cat.count}</span>
            </Toggle>
          ))}
          <button
            onClick={() => setSelected(all ? [] : abcCategories.map((c) => c.id))}
            className="ui rounded-full px-3 py-2 text-[13px] font-medium text-flash underline underline-offset-4 hover:opacity-75"
          >
            {all ? "odznacz wszystkie" : "zaznacz wszystkie"}
          </button>
        </div>
      </Field>

      <Field label="Liczba pytań">
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map((n) => (
            <Toggle key={n} active={length === n} onClick={() => setLength(n)}>
              {lengthLabel(n)}
            </Toggle>
          ))}
        </div>
      </Field>

      <Field label="Tryb">
        <div className="flex flex-wrap gap-2">
          <Toggle active={!exam} onClick={() => setExam(false)}>
            Nauka — odpowiedź od razu
          </Toggle>
          <Toggle active={exam} onClick={() => setExam(true)}>
            Egzamin — wynik na końcu
          </Toggle>
        </div>
        {weakSize > 0 && (
          <div className="mt-4">
            <Toggle active={onlyWeak} onClick={() => setOnlyWeak(!onlyWeak)}>
              Tylko pytania z błędami
              <span className="ml-2 font-mono text-[11px] opacity-60">{weakSize}</span>
            </Toggle>
          </div>
        )}
      </Field>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Btn
          variant="accent"
          className="px-7 py-3 text-base"
          disabled={planned === 0}
          onClick={onStart}
        >
          Zaczynamy
        </Btn>
        <p className="text-sm text-ink-soft">
          {planned === 0
            ? "Wybierz przynajmniej jeden dział."
            : `${planned} ${questionsWord(planned)} w losowej kolejności.`}
        </p>
      </div>
    </main>
  );
}

/* --------------------------------------------------------------- runner */

function Scale({ total, index }: { total: number; index: number }) {
  if (total > 40) {
    return (
      <div className="h-[3px] w-full bg-ink/12">
        <div
          className="h-full bg-ink transition-[width] duration-300"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
    );
  }
  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const done = i < index;
        return (
          <span
            key={i}
            className={`flex-1 rounded-[1px] transition-all ${
              i === index
                ? "h-4 bg-flash"
                : done
                  ? "h-2.5 bg-ink/45"
                  : "h-1.5 bg-ink/15"
            }`}
          />
        );
      })}
    </div>
  );
}

function Runner({
  items,
  index,
  picks,
  exam,
  onPick,
  onNext,
  onAbort,
}: {
  items: Item[];
  index: number;
  picks: (number | null)[];
  exam: boolean;
  onPick: (optionIndex: number) => void;
  onNext: () => void;
  onAbort: () => void;
}) {
  const item = items[index];
  const pick = picks[index];
  const answered = pick !== null;
  const reveal = answered && !exam;
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reveal) nextRef.current?.focus();
  }, [reveal, index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const slot = ["a", "1"].includes(key) ? 0 : ["b", "2"].includes(key) ? 1 : ["c", "3"].includes(key) ? 2 : -1;
      if (slot >= 0 && !answered) {
        e.preventDefault();
        onPick(item.order[slot]);
      } else if (key === "enter" && answered) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, item, onPick, onNext]);

  const category = categoryById.get(item.q.category);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-3xl flex-col px-5 py-8 sm:px-8">
      <div className="flex items-center gap-4">
        <span className="meta text-ink-faint">
          {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </span>
        <div className="flex-1">
          <Scale total={items.length} index={index} />
        </div>
        <button onClick={onAbort} className="meta text-ink-faint hover:text-ink">
          przerwij
        </button>
      </div>

      <article key={item.q.id} className="resolve flex flex-1 flex-col justify-center py-10">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>{category?.label}</Eyebrow>
          {item.q.difficulty && (
            <span className="meta text-amber">{difficultyLabel[item.q.difficulty]}</span>
          )}
        </div>

        <h1 className="mt-4 text-[1.4rem] leading-snug font-medium sm:text-[1.65rem]">
          {item.q.prompt}
        </h1>

        <ul className="mt-8 space-y-3">
          {item.order.map((optionIndex, slot) => {
            const correct = optionIndex === item.q.answer;
            const chosen = pick === optionIndex;

            let tone = "border-ink/14 bg-card hover:border-ink/40";
            let marker = "border-ink/25 text-ink-soft";
            if (reveal && correct) {
              tone = "border-duo-green bg-duo-green/[0.07]";
              marker = "border-duo-green bg-duo-green text-white";
            } else if (reveal && chosen) {
              tone = "border-duo-red bg-duo-red/[0.07]";
              marker = "border-duo-red bg-duo-red text-white";
            } else if (chosen) {
              tone = "border-flash bg-flash/[0.07]";
              marker = "border-flash bg-flash text-white";
            } else if (answered) {
              tone = "border-ink/14 bg-card opacity-55";
            }

            return (
              <li key={optionIndex}>
                <button
                  disabled={answered}
                  onClick={() => onPick(optionIndex)}
                  className={`flex w-full items-start gap-4 rounded-md border p-4 text-left transition-colors disabled:cursor-default ${tone}`}
                >
                  <span
                    className={`mt-px flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-semibold transition-colors ${marker}`}
                  >
                    {LETTERS[slot]}
                  </span>
                  <span className="text-[15px] leading-relaxed sm:text-base">
                    {item.q.options[optionIndex]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex min-h-12 flex-wrap items-center gap-4">
          {answered && (
            <>
              <Btn ref={nextRef} variant="solid" onClick={onNext} className="px-6">
                {index + 1 === items.length ? "Zakończ i pokaż wynik" : "Dalej"}
              </Btn>
              {reveal && (
                <p
                  className={`ui text-sm font-semibold ${
                    pick === item.q.answer ? "text-duo-green" : "text-duo-red"
                  }`}
                >
                  {pick === item.q.answer ? "Dobrze" : "Poprawna jest zaznaczona na zielono"}
                </p>
              )}
            </>
          )}
          {!answered && (
            <p className="meta text-ink-faint">
              Wybierz odpowiedź — klawisze A, B, C lub 1, 2, 3
            </p>
          )}
        </div>
      </article>
    </main>
  );
}

/* -------------------------------------------------------------- summary */

function verdict(pct: number) {
  if (pct >= 90) return "Gotowe na egzamin.";
  if (pct >= 75) return "Blisko. Domknij słabe działy.";
  if (pct >= 50) return "Materiał siedzi połowicznie — powtórz błędy.";
  return "Za wcześnie na egzamin. Wróć do działów po kolei.";
}

function Summary({
  items,
  picks,
  onRetryWrong,
  onNewTest,
}: {
  items: Item[];
  picks: (number | null)[];
  onRetryWrong: () => void;
  onNewTest: () => void;
}) {
  const wrong = items.filter((item, i) => picks[i] !== item.q.answer);
  const score = items.length - wrong.length;
  const pct = Math.round((score / items.length) * 100);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Eyebrow>Wynik</Eyebrow>

      <div className="resolve mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b rule pb-6">
        <p className="optotype text-[clamp(3.5rem,16vw,7rem)]">
          {score}
          <span className="text-ink-faint">/{items.length}</span>
        </p>
        <p className="optotype text-3xl text-flash">{pct}%</p>
      </div>

      <p className="resolve-1 resolve mt-5 text-lg text-ink-soft">{verdict(pct)}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {wrong.length > 0 && (
          <Btn variant="accent" onClick={onRetryWrong}>
            Powtórz {wrong.length} {questionsWord(wrong.length)}
          </Btn>
        )}
        <Btn variant="ghost" onClick={onNewTest}>
          Nowy test
        </Btn>
        <LinkBtn href="/" variant="quiet" className="px-3">
          Strona główna
        </LinkBtn>
      </div>

      {wrong.length > 0 && (
        <section className="mt-14">
          <Eyebrow>Błędne odpowiedzi</Eyebrow>
          <ul className="mt-5 space-y-8">
            {wrong.map((item) => {
              const i = items.indexOf(item);
              const pick = picks[i];
              return (
                <li key={item.q.id} className="border-b rule pb-8">
                  <p className="meta text-ink-faint">
                    {categoryById.get(item.q.category)?.label}
                  </p>
                  <p className="mt-2 text-[17px] leading-snug font-medium">
                    {item.q.prompt}
                  </p>
                  <p className="mt-4 border-l-2 border-duo-green pl-4 text-[15px] leading-relaxed">
                    <span className="meta mr-2 text-duo-green">poprawna</span>
                    {item.q.options[item.q.answer]}
                  </p>
                  {pick !== null && (
                    <p className="mt-2 border-l-2 border-duo-red pl-4 text-[15px] leading-relaxed text-ink-soft">
                      <span className="meta mr-2 text-duo-red">twoja</span>
                      {item.q.options[pick]}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
