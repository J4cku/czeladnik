import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import requireHook from "next/dist/build/next-config-ts/require-hook.js";

const load = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

requireHook.registerHook({
  jsc: {
    parser: { syntax: "typescript", tsx: true },
    transform: { react: { runtime: "automatic" } },
    paths: { "@/*": ["./*"] },
    baseUrl: ROOT,
  },
  module: { type: "commonjs" },
  isModule: "unknown",
  env: { targets: { node: process.versions.node } },
});
load.extensions[".tsx"] = load.extensions[".ts"];

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
