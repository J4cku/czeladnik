"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCatalog,
  LETTERS,
  questionsWord,
  type OpenQuestion,
  type ExamLevel,
  type Category,
} from "@/lib/data";
import {
  buildExam,
  EXAM_PER_CATEGORY,
  EXAM_SPLIT,
  examPlan,
  examLength,
  type WrittenExamQuestion,
} from "@/lib/exam";
import { sample, shuffle } from "@/lib/rng";
import { isWeak, recordAnswer, recordSession, useProgress } from "@/lib/progress";
import { Btn, Eyebrow, LinkBtn } from "@/components/ui";
import { QuestionMeta } from "@/components/QuestionMeta";
import { QuestionImage } from "@/components/QuestionImage";
import { QuestionAnswer } from "@/components/QuestionAnswer";
import { ExamLevelToggle } from "@/components/ExamLevelToggle";
import { normalizeLevel, selectedCategories, levelQuery } from "@/lib/exam-level";
import { acceptsStudyShortcut, canChooseAnswer, isStudyCorrect, summarizeStudyResults } from "@/lib/study";

type Item = { q: WrittenExamQuestion; order: number[] };
type Pick = number | boolean | null;
type Stage = "setup" | "running" | "done";

const isCorrect = isStudyCorrect;

const LENGTHS = [10, 20, 40, 0] as const;
const lengthLabel = (n: number) => (n === 0 ? "wszystkie" : String(n));

export default function TestClient() {
  const params = useSearchParams();
  return <LevelTest key={params.toString()} query={params.toString()} />;
}

function LevelTest({ query }: { query: string }) {
  const params = new URLSearchParams(query);
  const level = normalizeLevel(params.get("poziom"));
  const { abcQuestions } = getCatalog(level);
  const { store, ready } = useProgress();

  // Deep links: /test?dzialy=bhp,prawo-pracy or /test?tryb=bledne
  const [selected, setSelected] = useState<string[]>(() => selectedCategories(level, "abc", params.get("dzialy")));
  const [length, setLength] = useState<number>(20);
  // /test?arkusz=1 otwiera od razu tryb arkusza egzaminacyjnego
  const [sheet, setSheet] = useState(() => params.get("arkusz") === "1");
  const [exam, setExam] = useState(() => params.get("arkusz") === "1");
  const [onlyWeak, setOnlyWeak] = useState(() => params.get("tryb") === "bledne");

  const [stage, setStage] = useState<Stage>("setup");
  const [activeSheet, setActiveSheet] = useState(false);
  const [sessionMode, setSessionMode] = useState<"practice" | "exam" | "retry">("practice");
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);

  const weakIds = useMemo(() => {
    const set = new Set<string>();
    for (const q of abcQuestions) if (isWeak(store.stats[q.id])) set.add(q.id);
    return set;
  }, [store, abcQuestions]);

  const pool = useMemo(
    () =>
      abcQuestions.filter(
        (q) => selected.includes(q.category) && (!onlyWeak || weakIds.has(q.id)),
      ),
    [selected, onlyWeak, weakIds, abcQuestions],
  );

  const start = useCallback(
    (questions: WrittenExamQuestion[], count: number, keepOrder = false, fullSheet = false, retry = false) => {
      const picked = keepOrder
        ? questions
        : sample(questions, count > 0 ? count : questions.length);
      setItems(picked.map((q) => ({ q, order: q.kind === "abc" ? shuffle([0, 1, 2]) : [] })));
      setPicks(new Array(picked.length).fill(null));
      setIndex(0);
      setActiveSheet(fullSheet);
      setSessionMode(retry ? "retry" : exam ? "exam" : "practice");
      setStage("running");
    },
    [exam],
  );

  const finish = useCallback(
    (finalPicks: Pick[], list: Item[]) => {
      const result = summarizeStudyResults(list.map(({ q }) => q), finalPicks);
      const covered = [...new Set(list.map((item) => item.q.category))];
      recordSession({ ...result, categories: covered, level, mode: sessionMode });
      setStage("done");
    },
    [level, sessionMode],
  );

  if (stage === "setup") {
    return (
      <TestSetup
        level={level}
        onLevelChange={(next) => {
          const mode = new URLSearchParams(query);
          if (sheet) mode.set("arkusz", "1");
          else mode.delete("arkusz");
          if (onlyWeak) mode.set("tryb", "bledne");
          else mode.delete("tryb");
          window.history.pushState(null, "", `?${levelQuery(mode.toString(), next, "abc")}`);
        }}
        sheet={sheet}
        setSheet={(next) => {
          setSheet(next);
          if (next) {
            setExam(true);
            setOnlyWeak(false);
          }
        }}
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
        onStart={() => (sheet ? start(buildExam(level), 0, true, true) : start(pool, length, false, false, onlyWeak))}
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
          recordAnswer(item.q.id, isCorrect(item.q, pick));
          if (index + 1 < items.length) setIndex(index + 1);
          else finish(picks, items);
        }}
        onAbort={() => setStage("setup")}
      />
    );
  }

  return (
    <Summary
      level={level}
      sheet={activeSheet}
      items={items}
      picks={picks}
      onRetryWrong={() => {
        const wrong = items
          .filter((item, i) => !isCorrect(item.q, picks[i]))
          .map((item) => item.q);
        start(wrong, wrong.length, false, false, true);
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

function SheetPlan({ level }: { level: ExamLevel }) {
  const plan = examPlan(level);
  const split = EXAM_SPLIT.map((s) => s.count).join(" / ");

  return (
    <div className="mt-2">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b rule">
            <th className="meta pb-2 font-normal text-ink-faint">Temat</th>
            <th className="meta pb-2 text-right font-normal text-ink-faint">
              Ł / Ś / T
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.map(({ category }) => (
            <tr key={category.id} className="border-b rule">
              <td className="py-2.5 text-[15px]">{category.label}</td>
              <td className="py-2.5 text-right font-mono text-[13px]">
                {split}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-5 border-l-2 border-amber pl-4 text-[13.5px] leading-relaxed text-ink-soft">
        {plan.length} działów po {EXAM_PER_CATEGORY} pytań: 3 łatwe,
        2 średnie i 2 trudne w każdym dziale. Razem {examLength(level)} pytań.
      </p>
      <p className="mt-3 border-l-2 border-amber pl-4 text-[13.5px] leading-relaxed text-ink-soft">
        {level === "czeladnik"
          ? "Odpowiedzi w dziale Rysunek zawodowy sprawdzasz z odpowiedzią źródłową i oceniasz samodzielnie."
          : "Rysunek zawodowy zawiera pytania A/B/C sprawdzane tak samo jak pozostałe działy."}
      </p>
    </div>
  );
}

export function TestSetup({
  level,
  onLevelChange,
  sheet,
  setSheet,
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
  level: ExamLevel;
  onLevelChange: (level: ExamLevel) => void;
  sheet: boolean;
  setSheet: (v: boolean) => void;
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
  const { abcCategories } = getCatalog(level);
  const all = selected.length === abcCategories.length;
  const planned = sheet ? examLength(level) : length === 0 ? poolSize : Math.min(length, poolSize);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Eyebrow>Część pisemna</Eyebrow>
      <h1 className="optotype mt-3 text-4xl sm:text-5xl">Ustaw test</h1>

      <Field label="Poziom egzaminu">
        <ExamLevelToggle level={level} onChange={onLevelChange} />
      </Field>

      <Field label="Rodzaj">
        <div className="flex flex-wrap gap-2">
          <Toggle active={!sheet} onClick={() => setSheet(false)}>
            Własny zestaw
          </Toggle>
          <Toggle active={sheet} onClick={() => setSheet(true)}>
            Arkusz egzaminacyjny
            <span className="ml-2 font-mono text-[11px] opacity-60">{examLength(level)}</span>
          </Toggle>
        </div>
      </Field>

      {sheet ? (
        <Field label="Skład arkusza">
          <SheetPlan level={level} />
        </Field>
      ) : (
        <SetupCustom
          abcCategories={abcCategories}
          selected={selected}
          setSelected={setSelected}
          all={all}
          length={length}
          setLength={setLength}
        />
      )}

      <Field label="Tryb">
        <div className="flex flex-wrap gap-2">
          <Toggle active={!exam} onClick={() => setExam(false)}>
            Nauka — odpowiedź od razu
          </Toggle>
          <Toggle active={exam} onClick={() => setExam(true)}>
            Egzamin — wynik na końcu
          </Toggle>
        </div>
        {sheet && exam && level === "czeladnik" && (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Pytania A/B/C sprawdzisz na końcu. W rysunku zawodowym odpowiedź
            odkrywasz przed samooceną.
          </p>
        )}
        {!sheet && (weakSize > 0 || onlyWeak) && (
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
            : sheet
              ? `${planned} pytań, temat po temacie.`
              : `${planned} ${questionsWord(planned)} w losowej kolejności.`}
        </p>
      </div>
    </main>
  );
}

function SetupCustom({
  abcCategories,
  selected,
  setSelected,
  all,
  length,
  setLength,
}: {
  abcCategories: Category[];
  selected: string[];
  setSelected: (v: string[]) => void;
  all: boolean;
  length: number;
  setLength: (v: number) => void;
}) {
  return (
    <>
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
    </>
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

export function Runner({
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
  picks: Pick[];
  exam: boolean;
  onPick: (pick: Exclude<Pick, null>) => void;
  onNext: () => void;
  onAbort: () => void;
}) {
  const item = items[index];
  const question = item.q;
  const pick = picks[index];
  const answered = pick !== null;
  const reveal = answered && !exam;
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reveal) nextRef.current?.focus();
  }, [reveal, index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!acceptsStudyShortcut(e)) return;
      const key = e.key.toLowerCase();
      const slot = ["a", "1"].includes(key) ? 0 : ["b", "2"].includes(key) ? 1 : ["c", "3"].includes(key) ? 2 : -1;
      if (slot >= 0 && canChooseAnswer(pick, exam) && item.q.kind === "abc") {
        e.preventDefault();
        onPick(item.order[slot]);
      } else if (key === "enter" && answered) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, pick, exam, item, onPick, onNext]);

  const category = getCatalog(item.q.level).categoryById.get(item.q.category);

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
        <QuestionMeta category={category?.label} difficulty={item.q.difficulty} />

        <h1 className="mt-4 text-[1.4rem] leading-snug font-medium sm:text-[1.65rem]">
          {item.q.prompt}
        </h1>

        {question.image && (
          <div className="mt-6">
            <QuestionImage image={question.image} alt={`Rysunek do pytania: ${question.prompt}`} />
          </div>
        )}

        {question.kind === "abc" ? (
          <ul className="mt-8 space-y-3">
            {item.order.map((optionIndex, slot) => {
              const correct = optionIndex === question.answer;
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
              } else if (reveal) {
                tone = "border-ink/14 bg-card opacity-55";
              }

              return (
                <li key={optionIndex}>
                  <button
                    disabled={!canChooseAnswer(pick, exam)}
                    onClick={() => onPick(optionIndex)}
                    className={`flex w-full items-start gap-4 rounded-md border p-4 text-left transition-colors disabled:cursor-default ${tone}`}
                  >
                    <span
                      className={`mt-px flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-semibold transition-colors ${marker}`}
                    >
                      {LETTERS[slot]}
                    </span>
                    <span className="text-[15px] leading-relaxed sm:text-base">
                      {question.options[optionIndex]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <DrawingResponse
            key={question.id}
            question={question}
            pick={typeof pick === "boolean" ? pick : null}
            onPick={onPick}
          />
        )}

        <div className="mt-8 flex min-h-12 flex-wrap items-center gap-4">
          {answered && (
            <>
              <Btn ref={nextRef} variant="solid" onClick={onNext} className="px-6">
                {index + 1 === items.length ? "Zakończ i pokaż wynik" : "Dalej"}
              </Btn>
              {reveal && question.kind === "abc" && (
                <p
                  className={`ui text-sm font-semibold ${
                    isCorrect(question, pick) ? "text-duo-green" : "text-duo-red"
                  }`}
                >
                  {isCorrect(question, pick) ? "Dobrze" : "Poprawna jest zaznaczona na zielono"}
                </p>
              )}
            </>
          )}
          {!answered && question.kind === "abc" && (
            <p className="meta text-ink-faint">
              Wybierz odpowiedź — klawisze A, B, C lub 1, 2, 3
            </p>
          )}
          {answered && exam && question.kind === "abc" && (
            <p className="meta text-ink-faint">Możesz zmienić odpowiedź przed przejściem dalej.</p>
          )}
        </div>
      </article>
    </main>
  );
}

function DrawingResponse({
  question,
  pick,
  onPick,
}: {
  question: OpenQuestion;
  pick: boolean | null;
  onPick: (pick: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="mt-8">
      <p className="border-l-2 border-amber pl-4 text-sm leading-relaxed text-ink-soft">
        Odpowiedź z arkusza możesz sprawdzić poniżej; wynik tego pytania opiera się na Twojej samoocenie.
      </p>
      {revealed ? (
        <>
          <div className="mt-6 rounded-md border rule bg-card p-5">
            <QuestionAnswer question={question} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Btn variant="solid" disabled={pick !== null} onClick={() => onPick(true)}>
              Umiem
            </Btn>
            <Btn variant="ghost" disabled={pick !== null} onClick={() => onPick(false)}>
              Do powtórki
            </Btn>
            {pick !== null && (
              <p className={`ui text-sm font-semibold ${pick ? "text-duo-green" : "text-duo-red"}`}>
                {pick ? "Umiem" : "Do powtórki"}
              </p>
            )}
          </div>
        </>
      ) : (
        <Btn variant="solid" className="mt-6" onClick={() => setRevealed(true)}>
          Pokaż odpowiedź
        </Btn>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- summary */

export function Summary({
  level,
  sheet,
  items,
  picks,
  onRetryWrong,
  onNewTest,
}: {
  level: ExamLevel;
  sheet: boolean;
  items: Item[];
  picks: Pick[];
  onRetryWrong: () => void;
  onNewTest: () => void;
}) {
  const wrong = items.filter((item, i) => !isCorrect(item.q, picks[i]));
  const score = items.length - wrong.length;
  const pct = Math.round((score / items.length) * 100);
  const result = summarizeStudyResults(items.map(({ q }) => q), picks);

  const { categoryById } = getCatalog(level);
  const perCategory = result.perCategory;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Eyebrow>{sheet ? "Wynik treningowego arkusza" : "Wynik treningowy"}</Eyebrow>

      <div className="resolve mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b rule pb-6">
        <p className="optotype text-[clamp(3.5rem,16vw,7rem)]">
          {score}
          <span className="text-ink-faint">/{items.length}</span>
        </p>
        <p className="optotype text-3xl text-flash">{pct}%</p>
      </div>

      <p className="resolve-1 resolve mt-5 text-sm leading-relaxed text-ink-soft">
        Wynik służy do nauki. O zaliczeniu egzaminu decydują zasady właściwej izby i wyniki poszczególnych przedmiotów.
      </p>

      {result.selfAssessedTotal > 0 && (
        <div className="mt-4 space-y-2 text-sm text-ink-soft">
          <p>Odpowiedzi ABC: <strong>{result.objectiveScore}/{result.objectiveTotal}</strong> poprawnych.</p>
          <p>Rysunek zawodowy · samoocena: <strong>{result.selfAssessedScore}/{result.selfAssessedTotal}</strong> „umiem”.</p>
        </div>
      )}

      {perCategory.length > 0 && (
        <section className="mt-10">
          <Eyebrow>Wynik po tematach</Eyebrow>
          <ul className="mt-4 border-t rule">
            {perCategory.map((row) => (
              <li
                key={row.category}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b rule py-3"
              >
                <div>
                  <p className="text-[15px]">{categoryById.get(row.category)?.label}</p>
                  <p className="mt-1 text-xs text-ink-faint">{row.kind === "open" ? "Samoocena · umiem" : "Poprawne odpowiedzi ABC"}</p>
                  <div className="mt-2 h-[3px] w-full max-w-xs bg-ink/10">
                    <div
                      className="h-full bg-flash"
                      style={{ width: `${(row.score / row.total) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="font-mono text-[14px]">
                  {row.score}/{row.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {wrong.length > 0 && (
          <Btn variant="accent" onClick={onRetryWrong}>
            Powtórz {wrong.length} {questionsWord(wrong.length)}
          </Btn>
        )}
        <Btn variant="ghost" onClick={onNewTest}>
          Nowy test
        </Btn>
        <LinkBtn href={`/?poziom=${level}`} variant="quiet" className="px-3">
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
                  {item.q.image && <div className="mt-4"><QuestionImage image={item.q.image} alt={`Rysunek do pytania: ${item.q.prompt}`} /></div>}
                  {item.q.kind === "abc" ? (
                    <p className="mt-4 border-l-2 border-duo-green pl-4 text-[15px] leading-relaxed">
                      <span className="meta mr-2 text-duo-green">poprawna</span>
                      {item.q.options[item.q.answer]}
                    </p>
                  ) : (
                    <div className="mt-4 border-l-2 border-ink/20 pl-4"><QuestionAnswer question={item.q} /></div>
                  )}
                  {item.q.kind === "abc" && typeof pick === "number" && (
                    <p className="mt-2 border-l-2 border-duo-red pl-4 text-[15px] leading-relaxed text-ink-soft">
                      <span className="meta mr-2 text-duo-red">twoja</span>
                      {item.q.options[pick]}
                    </p>
                  )}
                  {item.q.kind === "open" && (
                    <p className="mt-2 text-sm text-ink-soft">Twoja samoocena: do powtórki</p>
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
