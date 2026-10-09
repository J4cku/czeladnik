# Final Workbook Integration Design

## Goal

Use the final Czeladnik and Mistrz workbooks as the app's complete source of truth, including the embedded drawing images.

## Product behavior

- The test and flashcard setup screens expose a `Czeladnik` / `Mistrz` level switch.
- Old URLs without `poziom` continue to open Czeladnik content.
- The Czeladnik written exam contains 49 questions: seven sections with 3 easy, 2 medium, and 2 hard questions each.
- The Mistrz written exam contains 63 questions: nine sections with the same 3/2/2 split.
- Each level's oral exam uses its own workbook and contains nine questions: one easy, medium, and hard question from Technology, Materials, and Machinery.
- Drawing images appear with their questions. Czeladnik drawing questions retain self-assessment; Mistrz drawing questions are ordinary ABC questions.
- Practical tasks remain Czeladnik-only.

## Data architecture

Both source workbooks live in `data/`. `scripts/extract.py` normalizes header variants, extracts cell data, maps worksheet image anchors to question rows, and writes `lib/questions.json` plus deduplicated PNG assets under `public/question-images/`. Categories and questions carry a level. Existing Czeladnik IDs remain stable; Mistrz IDs use a `mistrz-` prefix.

The two Mistrz business questions without difficulty remain available in custom practice but are naturally excluded from the fixed 3/2/2 exam. Missing official IDs use stable content hashes.

## UI architecture

`lib/data.ts` exposes level-scoped catalog helpers. Written and oral builders accept a level. A shared level toggle updates setup state and level-specific category lists. A shared image component uses stored intrinsic dimensions to avoid layout shift.

## Compatibility and validation

Progress remains in `ostrosc.progress.v2`; stable/namespaced IDs prevent collisions. Automated tests verify source totals, difficulty distributions, unique IDs, image counts, both written exam formats, both oral formats, and image rendering metadata. Lint, full tests, production build, and responsive browser checks gate release.
