import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const load = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { transformSync } = load("next/dist/build/swc");
for (const extension of [".ts", ".tsx"]) {
  load.extensions[extension] = (module, filename) => {
    const { code } = transformSync(readFileSync(filename, "utf8"), {
      filename,
      jsc: {
        parser: { syntax: "typescript", tsx: true },
        transform: { react: { runtime: "automatic" } },
        paths: { "@/*": [`${ROOT}/*`] }, baseUrl: ROOT,
      },
      module: { type: "commonjs" }, isModule: "unknown",
      env: { targets: { node: process.versions.node } },
    });
    module._compile(code, filename);
  };
}

function study() {
  assert.ok(existsSync(path.join(ROOT, "lib/study.ts")), "study selection and keyboard guards must be testable");
  return load("../lib/study.ts");
}

test("a short review includes the only unseen card before known cards", () => {
  const { selectStudyCards } = study();
  const cards = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}` }));
  const stats = Object.fromEntries(cards.slice(1).map(({ id }) => [id, { lastOk: true }]));
  for (let i = 0; i < 30; i++) {
    const picked = selectStudyCards(cards, stats, 10, true);
    assert.equal(picked.length, 10);
    assert.equal(picked[0].id, "q0");
    assert.equal(new Set(picked.map(({ id }) => id)).size, 10);
  }
});

test("full review decks preserve unseen, failed, known priority without mutating input", () => {
  const { selectStudyCards } = study();
  const cards = [{ id: "known" }, { id: "failed" }, { id: "unseen" }, { id: "unseen2" }];
  const original = cards.slice();
  const stats = { known: { lastOk: true }, failed: { lastOk: false } };
  const picked = selectStudyCards(cards, stats, 0, true);
  assert.deepEqual(picked.slice(0, 2).map(({ id }) => id).sort(), ["unseen", "unseen2"]);
  assert.equal(picked[2].id, "failed");
  assert.equal(picked[3].id, "known");
  assert.deepEqual(cards, original);
  assert.equal(selectStudyCards([], {}, 10, true).length, 0);
  assert.equal(selectStudyCards(cards, stats, 99, false).length, 4);
});

test("study shortcuts leave focused interactive controls, modifiers, and repeats alone", () => {
  const { acceptsStudyShortcut } = study();
  const base = { repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, defaultPrevented: false, target: null };
  assert.equal(acceptsStudyShortcut(base), true);
  for (const flag of ["repeat", "ctrlKey", "metaKey", "altKey", "shiftKey", "defaultPrevented"]) {
    assert.equal(acceptsStudyShortcut({ ...base, [flag]: true }), false, flag);
  }
  const prior = globalThis.Element;
  class Control {
    constructor(interactive) { this.interactive = interactive; }
    closest(selector) {
      assert.match(selector, /button/);
      assert.match(selector, /summary/);
      assert.match(selector, /contenteditable/);
      return this.interactive ? this : null;
    }
  }
  globalThis.Element = Control;
  try {
    assert.equal(acceptsStudyShortcut({ ...base, target: new Control(true) }), false);
    assert.equal(acceptsStudyShortcut({ ...base, target: new Control(false) }), true);
  } finally {
    if (prior === undefined) delete globalThis.Element;
    else globalThis.Element = prior;
  }
});

test("exam choices remain editable while practice feedback locks the first response", () => {
  const { canChooseAnswer } = study();
  assert.equal(canChooseAnswer(null, false), true);
  assert.equal(canChooseAnswer(0, false), false);
  assert.equal(canChooseAnswer(0, true), true);
});

test("training summaries distinguish objective correctness from open self-assessment", () => {
  const { summarizeStudyResults } = study();
  const questions = [
    { category: "bhp", kind: "abc", answer: 1, difficulty: "latwe" },
    { category: "bhp", kind: "abc", answer: 2, difficulty: "trudne" },
    { category: "rysunek", kind: "open", answer: "key", difficulty: "latwe" },
  ];
  const result = summarizeStudyResults(questions, [1, 0, true]);
  assert.equal(result.score, 2);
  assert.equal(result.total, 3);
  assert.equal(result.objectiveScore, 1);
  assert.equal(result.objectiveTotal, 2);
  assert.equal(result.selfAssessedScore, 1);
  assert.equal(result.selfAssessedTotal, 1);
  assert.deepEqual(result.perCategory, [
    { category: "bhp", kind: "abc", score: 1, total: 2 },
    { category: "rysunek", kind: "open", score: 1, total: 1 },
  ]);
  assert.deepEqual(result.difficultyResults, [
    { difficulty: "latwe", score: 2, total: 2 },
    { difficulty: "trudne", score: 0, total: 1 },
  ]);
});

test("expanded answers preserve paragraph text and stay under a source-labelled disclosure", () => {
  assert.ok(existsSync(path.join(ROOT, "components/QuestionAnswer.tsx")), "open answers need a shared explanation view");
  const { QuestionAnswer } = load("../components/QuestionAnswer.tsx");
  const html = renderToStaticMarkup(React.createElement(QuestionAnswer, {
    question: { answer: "Key\nSecond line", explanation: "Supporting text\n\nSecond paragraph" },
  }));
  assert.match(html, /Key\nSecond line/);
  assert.match(html, /whitespace-pre-wrap/);
  assert.match(html, /<details/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /Objaśnienie z arkusza/);
  assert.match(html, /Supporting text\n\nSecond paragraph/);
  const keyOnly = renderToStaticMarkup(React.createElement(QuestionAnswer, { question: { answer: "Key only" } }));
  assert.doesNotMatch(keyOnly, /<details/);
});

test("rendered results report training and topic counts without a predicted pass verdict", () => {
  const { Summary } = load("../app/test/TestClient.tsx");
  assert.equal(typeof Summary, "function", "results must render independently of navigation and progress hooks");
  const { getCatalog } = load("../lib/data.ts");
  const catalog = getCatalog();
  const questions = [catalog.abcQuestions.find(({ category }) => category === "bhp"), catalog.openQuestions.find(({ category }) => category === "rysunek")];
  const html = renderToStaticMarkup(React.createElement(Summary, {
    level: "czeladnik", sheet: true,
    items: questions.map((q) => ({ q, order: [0, 1, 2] })), picks: [questions[0].answer, true],
    onRetryWrong() {}, onNewTest() {},
  }));
  assert.match(html, /Wynik treningowego arkusza/);
  assert.match(html, /Odpowiedzi ABC/);
  assert.match(html, /Rysunek zawodowy · samoocena/);
  assert.match(html, /Poprawne odpowiedzi ABC/);
  assert.doesNotMatch(html, /Zdane|Niezdane|Gotowe na egzamin|próg przyjęty/);
});

test("rendered exam options allow revisions and practice options lock after feedback", () => {
  const { Runner } = load("../app/test/TestClient.tsx");
  assert.equal(typeof Runner, "function", "the study surface must render independently of navigation hooks");
  const { getCatalog } = load("../lib/data.ts");
  const q = getCatalog().abcQuestions[0];
  const props = { items: [{ q, order: [0, 1, 2] }], index: 0, picks: [0], onPick() {}, onNext() {}, onAbort() {} };
  const exam = renderToStaticMarkup(React.createElement(Runner, { ...props, exam: true }));
  const practice = renderToStaticMarkup(React.createElement(Runner, { ...props, exam: false }));
  assert.equal((exam.match(/disabled=""/g) ?? []).length, 0);
  assert.equal((practice.match(/disabled=""/g) ?? []).length, 3);
  assert.match(exam, /Możesz zmienić odpowiedź/);
  assert.doesNotMatch(exam, /Poprawna jest zaznaczona na zielono/);
});
