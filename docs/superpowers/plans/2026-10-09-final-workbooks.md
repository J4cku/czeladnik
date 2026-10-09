# Final Workbooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete Czeladnik and Mistrz study modes from the final picture-backed workbooks.

**Architecture:** A single extracted catalog carries level metadata and optional image metadata. Level-aware selectors feed reusable written, oral, home, and section UIs while preserving existing apprentice URLs and progress IDs.

**Tech Stack:** Python 3 + openpyxl, Next.js 16 App Router, React 19, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-09-final-workbooks-design.md`

## Global Constraints

- Default URLs to `czeladnik` and keep existing Czeladnik question IDs stable.
- Prefix Mistrz IDs to prevent progress collisions.
- Build written exams with 3 easy, 2 medium, and 2 hard questions per section.
- Build oral exams with one question per difficulty from each of three oral sections.
- Map drawings by worksheet row anchor, not by media filename.
- Keep practical tasks Czeladnik-only.

## Review Focus

- A URL without a level must still show the prior Czeladnik experience.
- Switching level must reset selections to categories valid for the new level.
- Two Mistrz questions with missing difficulty must not break a 63-question exam.
- Reused Czeladnik media must resolve to every one of the 59 drawing questions.
- Progress IDs must be globally unique while existing Czeladnik IDs remain unchanged.

---

### Task 1: Extract both workbooks and drawings

**Files:**
- Replace: `data/Czeladnik_optyk_pytania_odpowiedzi.xlsx`
- Create: `data/Mistrz_optyk_pytania_odpowiedzi.xlsx`
- Modify: `scripts/extract.py`
- Modify: `scripts/test_questions_data.py`
- Generate: `lib/questions.json`
- Generate: `public/question-images/*.png`

**Interfaces:**
- Produces catalog categories/questions with `level` and optional `{ src, width, height }` image metadata.

- [ ] Add failing tests for 732/853 source totals, level-specific distributions, globally unique IDs, 59/60 image mappings, and stable apprentice IDs.
- [ ] Run `python3 -B -m unittest scripts.test_questions_data` and confirm failures against the single-workbook catalog.
- [ ] Implement normalized headers, level configurations, row-anchored image extraction, and asset hashing.
- [ ] Run `npm run data` and the Python tests until green.

### Task 2: Make catalog and exam builders level-aware

**Files:**
- Modify: `lib/data.ts`
- Modify: `lib/exam.ts`
- Modify: `lib/oral-exam.ts`
- Modify: `scripts/test_exam.mjs`

**Interfaces:**
- Produces `ExamLevel`, `getCatalog(level)`, `examPlan(level)`, `buildExam(level)`, `oralExamPlan(level)`, and `buildOralExam(level)`.

- [ ] Add failing Node tests for Czeladnik 49/7, Mistrz 63/9, oral 9 for each level, and question image markup.
- [ ] Run `node --test scripts/test_exam.mjs` and confirm the new tests fail for missing level APIs.
- [ ] Implement level-scoped selectors and builders with Czeladnik defaults.
- [ ] Add a shared `QuestionImage` component using Next Image intrinsic dimensions.
- [ ] Run the Node tests until green.

### Task 3: Add the level switch and picture-backed study flows

**Files:**
- Create: `components/ExamLevelToggle.tsx`
- Modify: `app/test/TestClient.tsx`
- Modify: `app/fiszki/FiszkiClient.tsx`
- Modify: `app/Dzialy.tsx`
- Modify: `app/page.tsx`
- Modify: `app/ProgressStrip.tsx`
- Modify: `components/ui.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/test/page.tsx`

**Interfaces:**
- Consumes the level-aware catalogs/builders and preserves `poziom` in deep links.

- [ ] Render a two-option level control on written, oral, and section screens.
- [ ] Scope category pools, weak-question counts, exam plans, summaries, and deep links by level.
- [ ] Render drawings before answer controls and remove all missing-image copy.
- [ ] Update landing content, metadata, footer, and practical-task labeling for both qualifications.

### Task 4: Documentation and release verification

**Files:**
- Modify: `README.md`

- [ ] Document both source workbooks, exam formats, images, and regeneration.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Smoke-test both levels and drawing questions at desktop and mobile widths.
- [ ] Request independent review, fix any findings, create a PR to `main`, and merge it.
