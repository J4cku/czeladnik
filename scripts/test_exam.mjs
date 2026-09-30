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

test("Business Activity uses the 3/3/2 exam split", () => {
  const { buildExam, examPlan } = load("../lib/exam.ts");
  const plan = examPlan().find(({ category }) => category.id === "dzialalnosc");

  assert.equal(plan?.graded, true);
  assert.deepEqual(plan?.available, { latwe: 25, srednie: 25, trudne: 11 });

  const picked = buildExam().filter(({ category }) => category === "dzialalnosc");
  const counts = picked.reduce((result, { difficulty }) => {
    result[difficulty] = (result[difficulty] ?? 0) + 1;
    return result;
  }, {});
  assert.equal(counts.latwe, 3);
  assert.equal(counts.srednie, 3);
  assert.equal(counts.trudne, 2);
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
