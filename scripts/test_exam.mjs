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
const swcOptions = {
  jsc: {
    parser: { syntax: "typescript", tsx: true },
    transform: { react: { runtime: "automatic" } },
    paths: { "@/*": [`${ROOT}/*`] },
    baseUrl: ROOT,
  },
  module: { type: "commonjs" },
  isModule: "unknown",
  env: { targets: { node: process.versions.node } },
};
for (const extension of [".ts", ".tsx"]) {
  load.extensions[extension] = (module, filename) => {
    const { code } = transformSync(readFileSync(filename, "utf8"), { ...swcOptions, filename });
    module._compile(code, filename);
  };
}

test("the apprentice written exam uses 7 sections with a 3/2/2 split", () => {
  const { buildExam, examPlan, EXAM_LENGTH } = load("../lib/exam.ts");
  const plan = examPlan();
  const exam = buildExam();

  assert.equal(EXAM_LENGTH, 49);
  assert.equal(plan.length, 7);
  assert.equal(plan.every(({ graded }) => graded), true);
  assert.equal(exam.length, 49);

  for (const { category } of plan) {
    const picked = exam.filter((question) => question.category === category.id);
    const counts = picked.reduce((result, { difficulty }) => {
      result[difficulty] = (result[difficulty] ?? 0) + 1;
      return result;
    }, {});

    assert.equal(picked.length, 7, category.id);
    assert.equal(counts.latwe, 3, category.id);
    assert.equal(counts.srednie, 2, category.id);
    assert.equal(counts.trudne, 2, category.id);
  }

  assert.equal(exam.filter(({ category }) => category === "rysunek").length, 7);
  assert.equal(exam.find(({ category }) => category === "rysunek")?.kind, "open");
});

test("the oral exam uses one question per difficulty from each oral section", () => {
  const { buildOralExam, ORAL_EXAM_LENGTH } = load("../lib/oral-exam.ts");
  const exam = buildOralExam();

  assert.equal(ORAL_EXAM_LENGTH, 9);
  assert.equal(exam.length, 9);

  for (const category of ["ustny-technologia", "ustny-materialy", "ustny-maszyny"]) {
    const picked = exam.filter((question) => question.category === category);
    assert.equal(picked.length, 3, category);
    assert.deepEqual(
      picked.map(({ difficulty }) => difficulty).sort(),
      ["latwe", "srednie", "trudne"],
      category,
    );
  }
});

for (const { level, count, sections, writtenIds, drawingKind } of [
  {
    level: "czeladnik",
    count: 49,
    sections: 7,
    writtenIds: ["rachunkowosc", "dokumentacja", "rysunek", "bhp", "srodowisko", "prawo-pracy", "dzialalnosc"],
    drawingKind: "open",
  },
  {
    level: "mistrz",
    count: 63,
    sections: 9,
    writtenIds: ["mistrz-rachunkowosc", "mistrz-dokumentacja", "mistrz-rysunek", "mistrz-bhp", "mistrz-srodowisko", "mistrz-prawo-pracy", "mistrz-dzialalnosc", "mistrz-psychologia", "mistrz-metodyka"],
    drawingKind: "abc",
  },
]) {
  test(`${level} written exams contain ${count} questions in ${sections} sections`, () => {
    const { buildExam, examPlan, examLength } = load("../lib/exam.ts");
    const plan = examPlan(level);
    const exam = buildExam(level);

    assert.equal(exam.length, count);
    assert.equal(plan.length, sections);
    assert.deepEqual(plan.map(({ category }) => category.id), writtenIds);
    assert.ok(plan.every(({ category, graded }) => category.level === level && graded));
    assert.ok(exam.every((question) => question.level === level));
    assert.equal(new Set(exam.map(({ id }) => id)).size, count);
    assert.equal(typeof examLength, "function", "the UI needs a level-specific exam length");
    assert.equal(examLength(level), count);

    for (const category of writtenIds) {
      const picked = exam.filter((question) => question.category === category);
      assert.equal(picked.length, 7, category);
      assert.equal(picked.filter(({ difficulty }) => difficulty === "latwe").length, 3, category);
      assert.equal(picked.filter(({ difficulty }) => difficulty === "srednie").length, 2, category);
      assert.equal(picked.filter(({ difficulty }) => difficulty === "trudne").length, 2, category);
    }

    const drawing = exam.filter(({ category }) => category.endsWith("rysunek"));
    assert.ok(drawing.every(({ kind, image }) => kind === drawingKind && image));
  });

  test(`${level} oral exams contain nine level-scoped questions with one per difficulty`, () => {
    const { buildOralExam, oralExamPlan } = load("../lib/oral-exam.ts");
    const plan = oralExamPlan(level);
    const exam = buildOralExam(level);
    const prefix = level === "mistrz" ? "mistrz-" : "";
    const ids = ["ustny-technologia", "ustny-materialy", "ustny-maszyny"].map((id) => prefix + id);

    assert.equal(plan.length, 3);
    assert.deepEqual(plan.map(({ category }) => category.id), ids);
    assert.ok(plan.every(({ category }) => category.level === level));
    assert.equal(exam.length, 9);
    assert.equal(new Set(exam.map(({ id }) => id)).size, 9);
    assert.ok(exam.every(({ level: questionLevel, kind }) => questionLevel === level && kind === "open"));
    for (const category of ids) {
      assert.deepEqual(
        exam.filter((question) => question.category === category).map(({ difficulty }) => difficulty).sort(),
        ["latwe", "srednie", "trudne"],
        category,
      );
    }
  });
}

test("level-scoped catalogs keep undifficultied master questions in custom practice", () => {
  const { getCatalog } = load("../lib/data.ts");
  assert.equal(typeof getCatalog, "function", "catalog selectors must accept an exam level");

  for (const { level, total, categoryCount } of [
    { level: "czeladnik", total: 732, categoryCount: 11 },
    { level: "mistrz", total: 853, categoryCount: 12 },
  ]) {
    const catalog = getCatalog(level);
    assert.equal(catalog.totalCount, total);
    assert.equal(catalog.questions.length, total);
    assert.equal(catalog.categories.length, categoryCount);
    assert.ok(catalog.categories.every((category) => category.level === level));
    assert.ok(catalog.questions.every((question) => question.level === level));
    assert.equal(catalog.categoryById.size, categoryCount);
    assert.ok(catalog.questions.every(({ category }) => catalog.categoryById.has(category)));
    assert.ok(catalog.abcCategories.every(({ kind, level: categoryLevel }) => kind === "abc" && categoryLevel === level));
    assert.ok(catalog.openCategories.every(({ kind, level: categoryLevel }) => kind === "open" && categoryLevel === level));
    assert.ok(catalog.abcQuestions.every(({ kind, level: questionLevel }) => kind === "abc" && questionLevel === level));
    assert.ok(catalog.openQuestions.every(({ kind, level: questionLevel }) => kind === "open" && questionLevel === level));
    assert.ok(catalog.taskQuestions.every(({ kind, level: questionLevel }) => kind === "task" && questionLevel === level));
    assert.equal(catalog.taskQuestions.length, level === "czeladnik" ? 30 : 0);
  }

  const master = getCatalog("mistrz");
  const undifficultied = master.abcQuestions.filter(({ category, difficulty }) =>
    category === "mistrz-dzialalnosc" && difficulty === undefined,
  );
  assert.equal(undifficultied.length, 2);
  const { buildExam } = load("../lib/exam.ts");
  assert.ok(buildExam("mistrz").every(({ id }) => !undifficultied.some((question) => question.id === id)));
});

test("legacy catalog exports and default builders remain apprentice-only", () => {
  const data = load("../lib/data.ts");
  assert.equal(data.totalCount, 732);
  assert.ok(data.categories.every(({ level }) => level === "czeladnik"));
  assert.ok(data.questions.every(({ level }) => level === "czeladnik"));
  assert.equal(typeof data.getCatalog, "function");
  assert.deepEqual(data.getCatalog(), data.getCatalog("czeladnik"));
  const { examLength, examPlan } = load("../lib/exam.ts");
  assert.equal(examLength(), 49);
  assert.ok(examPlan().every(({ category }) => category.level === "czeladnik"));
});

test("question images render stored intrinsic dimensions and an accessible description", () => {
  assert.ok(existsSync(path.join(ROOT, "components/QuestionImage.tsx")), "question images need a shared renderer");
  const { QuestionImage } = load("../components/QuestionImage.tsx");
  const html = renderToStaticMarkup(React.createElement(QuestionImage, {
    image: { src: "/question-images/drawing.png", width: 320, height: 180 },
    alt: "Schemat soczewki",
  }));
  assert.match(html, /<img\b/);
  assert.match(html, /width="320"/);
  assert.match(html, /height="180"/);
  assert.match(html, /alt="Schemat soczewki"/);
  assert.match(html, /drawing\.png/);
  assert.match(html, /data-nimg="1"/);
  assert.match(html, /h-auto/);
  assert.match(html, /max-w-full/);
});

test("questions without drawing metadata render no image", () => {
  assert.ok(existsSync(path.join(ROOT, "components/QuestionImage.tsx")), "question images need a shared renderer");
  const { QuestionImage } = load("../components/QuestionImage.tsx");
  assert.equal(renderToStaticMarkup(React.createElement(QuestionImage)), "");
});

test("question metadata renders the oral difficulty badge", () => {
  const { QuestionMeta } = load("../components/QuestionMeta.tsx");
  const html = renderToStaticMarkup(
    React.createElement(QuestionMeta, {
      category: "Technologia",
      difficulty: "srednie",
    }),
  );

  assert.match(html, /Technologia/);
  assert.match(html, /średnie/);
  assert.match(html, /text-amber/);
});

test("the latest dataset uses a fresh progress store", () => {
  const { PROGRESS_STORAGE_KEY } = load("../lib/progress.ts");

  assert.equal(PROGRESS_STORAGE_KEY, "ostrosc.progress.v2");
});

test("the level control identifies its two qualifications and active choice accessibly", () => {
  assert.ok(existsSync(path.join(ROOT, "components/ExamLevelToggle.tsx")), "the shared level control must exist");
  const { ExamLevelToggle } = load("../components/ExamLevelToggle.tsx");
  for (const level of ["czeladnik", "mistrz"]) {
    const html = renderToStaticMarkup(React.createElement(ExamLevelToggle, { level, onChange() {} }));
    assert.match(html, /role="group"/);
    assert.match(html, /aria-label="Poziom egzaminu"/);
    const buttons = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)];
    assert.equal(buttons.length, 2);
    assert.match(buttons[0][2], /Czeladnik/);
    assert.match(buttons[1][2], /Mistrz/);
    assert.match(buttons[level === "mistrz" ? 1 : 0][1], /aria-pressed="true"/);
    assert.match(buttons[level === "mistrz" ? 0 : 1][1], /aria-pressed="false"/);
  }
});

test("level normalization retains legacy URLs and rejects unknown qualifications", () => {
  assert.ok(existsSync(path.join(ROOT, "lib/exam-level.ts")), "level query helpers must exist");
  const { normalizeLevel } = load("../lib/exam-level.ts");
  for (const input of [undefined, null, "", "unknown", "Mistrz", "czeladnik"]) {
    assert.equal(normalizeLevel(input), "czeladnik");
  }
  assert.equal(normalizeLevel("mistrz"), "mistrz");
});

test("category selection filters invalid levels and kinds and falls back to the requested catalog", () => {
  assert.ok(existsSync(path.join(ROOT, "lib/exam-level.ts")), "level query helpers must exist");
  const { selectedCategories } = load("../lib/exam-level.ts");
  assert.deepEqual(selectedCategories("mistrz", "abc", "bhp,mistrz-bhp,mistrz-ustny-technologia,mistrz-bhp"), ["mistrz-bhp"]);
  assert.deepEqual(selectedCategories("czeladnik", "open", "rysunek,bhp"), ["rysunek"]);
  assert.deepEqual(selectedCategories("mistrz", "open", "rysunek"), ["mistrz-ustny-technologia", "mistrz-ustny-materialy", "mistrz-ustny-maszyny"]);
});

test("level switches discard old category IDs and retain written and oral mode parameters", () => {
  assert.ok(existsSync(path.join(ROOT, "lib/exam-level.ts")), "level query helpers must exist");
  const { levelQuery } = load("../lib/exam-level.ts");
  const written = new URLSearchParams(levelQuery("dzialy=bhp&arkusz=1&tryb=bledne", "mistrz", "abc"));
  assert.equal(written.get("poziom"), "mistrz");
  assert.equal(written.has("dzialy"), false);
  assert.equal(written.get("arkusz"), "1");
  assert.equal(written.get("tryb"), "bledne");
  const oral = new URLSearchParams(levelQuery("egzamin=1&dzialy=mistrz-ustny-maszyny,ustny-maszyny", "mistrz", "open"));
  assert.equal(oral.get("egzamin"), "1");
  assert.equal(oral.get("dzialy"), "mistrz-ustny-maszyny");
  assert.equal(new URLSearchParams(levelQuery("poziom=mistrz", "czeladnik")).get("poziom"), "czeladnik");
});

test("progress summaries count only questions belonging to the selected qualification", () => {
  assert.ok(existsSync(path.join(ROOT, "lib/exam-level.ts")), "level query helpers must exist");
  const { levelProgress } = load("../lib/exam-level.ts");
  const stats = {
    "bhp-81331": { seen: 2, ok: 1, bad: 1, lastOk: false, ts: 1 },
    "mistrz-bhp-81410": { seen: 1, ok: 1, bad: 0, lastOk: true, ts: 1 },
    "removed-1": { seen: 1, ok: 0, bad: 1, lastOk: false, ts: 1 },
  };
  assert.deepEqual(levelProgress("czeladnik", stats), { answered: 1, weak: 1, accuracy: 50 });
  assert.deepEqual(levelProgress("mistrz", stats), { answered: 1, weak: 0, accuracy: 100 });
});

test("written setup renders the selected level's sheet and apprentice-only self-assessment", () => {
  const { TestSetup } = load("../app/test/TestClient.tsx");
  assert.equal(typeof TestSetup, "function", "written setup must render independently of URL hooks");
  const props = { sheet: true, selected: [], length: 20, exam: true, onlyWeak: false, poolSize: 0, weakSize: 0 };
  for (const name of ["onLevelChange", "setSheet", "setSelected", "setLength", "setExam", "setOnlyWeak", "onStart"]) props[name] = () => {};
  const master = renderToStaticMarkup(React.createElement(TestSetup, { ...props, level: "mistrz" }));
  assert.match(master, /63 pyta/);
  assert.match(master, /9 działów/);
  assert.match(master, /Psychologia/);
  assert.doesNotMatch(master, /odkrywasz przed samooceną/);
  const apprentice = renderToStaticMarkup(React.createElement(TestSetup, { ...props, level: "czeladnik" }));
  assert.match(apprentice, /49 pyta/);
  assert.match(apprentice, /7 działów/);
  assert.match(apprentice, /odkrywasz przed samooceną/);
});

test("active weak-only mode remains removable when a level has no weak questions", () => {
  const { TestSetup } = load("../app/test/TestClient.tsx");
  assert.equal(typeof TestSetup, "function", "written setup must render independently of URL hooks");
  const props = { level: "mistrz", sheet: false, selected: ["mistrz-bhp"], length: 20, exam: false, onlyWeak: true, poolSize: 0, weakSize: 0 };
  for (const name of ["onLevelChange", "setSheet", "setSelected", "setLength", "setExam", "setOnlyWeak", "onStart"]) props[name] = () => {};
  const html = renderToStaticMarkup(React.createElement(TestSetup, props));
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*>Tylko pytania z błędami/);
});

test("clicking the active qualification leaves legacy and explicit setup queries untouched", () => {
  const { ExamLevelToggle } = load("../components/ExamLevelToggle.tsx");
  const { normalizeLevel, levelQuery } = load("../lib/exam-level.ts");
  for (const query of ["dzialy=bhp", "egzamin=1&dzialy=ustny-maszyny", "poziom=czeladnik", "poziom=mistrz&dzialy=mistrz-bhp"]) {
    const params = new URLSearchParams(query);
    const level = normalizeLevel(params.get("poziom"));
    let navigatedQuery = query;
    const transitions = [];
    const control = ExamLevelToggle({ level, onChange(next) {
      transitions.push(next);
      navigatedQuery = levelQuery(query, next);
    } });
    const active = level === "mistrz" ? 1 : 0;
    control.props.children[active].props.onClick();
    assert.equal(navigatedQuery, query, "the active option must not write a query and remount setup");
    assert.deepEqual(transitions, []);
    control.props.children[1 - active].props.onClick();
    assert.deepEqual(transitions, [level === "mistrz" ? "czeladnik" : "mistrz"]);
  }
});

test("repeat progress counts only weak ABC questions available to its written-practice destination", () => {
  const { levelProgress } = load("../lib/exam-level.ts");
  const weak = { seen: 1, ok: 0, bad: 1, lastOk: false, ts: 1 };
  const stats = {
    "bhp-81331": weak,
    "ustny-technologia-249086": weak,
    "rysunek-269004": weak,
    "mistrz-bhp-81410": weak,
    "mistrz-ustny-technologia-250510": weak,
    "removed-1": weak,
  };
  assert.deepEqual(levelProgress("czeladnik", stats), { answered: 3, weak: 1, accuracy: 0 });
  assert.deepEqual(levelProgress("mistrz", stats), { answered: 2, weak: 1, accuracy: 0 });
  assert.equal(levelProgress("czeladnik", { "ustny-technologia-249086": weak, "rysunek-269004": weak }).weak, 0);
  assert.equal(levelProgress("mistrz", { "mistrz-ustny-technologia-250510": weak }).weak, 0);
});

test("the repeat CTA labels ABC practice and routes to the selected qualification", () => {
  const { ProgressRepeat } = load("../app/ProgressStrip.tsx");
  assert.equal(typeof ProgressRepeat, "function", "the repeat CTA must render independently of browser progress hydration");
  for (const level of ["czeladnik", "mistrz"]) {
    const html = renderToStaticMarkup(React.createElement(ProgressRepeat, { level, count: 1 }));
    assert.match(html, new RegExp(`href="/test\\?poziom=${level}&amp;tryb=bledne"`));
    assert.match(html, /Powtórz 1 pytanie ABC/);
    assert.equal(renderToStaticMarkup(React.createElement(ProgressRepeat, { level, count: 0 })), "");
  }
});
