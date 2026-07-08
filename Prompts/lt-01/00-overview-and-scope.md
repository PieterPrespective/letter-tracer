# 00 — Overview & Scope

## Product summary

A Dutch **letter-tracing** progressive web app for young children (roughly
group 2–3, ages 4–6). The child traces **blokletters** (unjoined block/print
letters) on a touchscreen, following the pedagogically correct **schrijfrichting**
(writing direction) and stroke order taught by the Dutch **Pennenstreken**
(Zwijsen) method. The app also supports numbers, whole words, and simple
addition/subtraction "sums" rendered as tracing exercises. Content is
data-driven and extensible by the parent through an in-app editor; user content
persists locally. The app must work fully offline and install as a PWA.

## Target user & device

- **Primary user:** a 4–6 year-old child, tracing with finger or **S-Pen**.
- **Secondary user:** a parent, who selects exercises and adds custom content.
- **Reference device:** **Samsung Galaxy Tab S8 (SM-X700)**, 11" 120 Hz, touch +
  S-Pen. Landscape and portrait both supported; design for landscape first.
- **Browser:** Chromium-based (Samsung Internet / Chrome on Android). Must also
  run acceptably on a desktop Chromium for development.

## In scope

- Trace **letters** (a–z, plus Dutch-relevant glyphs — see note below), **digits**
  (0–9), **words**, and **sums** (e.g. `2 + 3 = 5`).
- Forgiving distance-to-path hit-testing with tolerance radius.
- Stroke **order** and **direction** validation (schrijfrichting).
- Kid-friendly feedback: progress trail, per-stroke success, celebration on
  completion, gentle correction (no harsh failure).
- Data-driven content model (JSON) + base dataset.
- In-app **content editor** writing to IndexedDB; import/export of content packs.
- Full **offline** operation via a service worker; installable PWA.
- Session/exercise selection UI and simple progress indication.

## Out of scope (for lt-01)

- Any machine learning / handwriting recognition (the tracing model is purely
  geometric).
- Any backend, account system, cloud sync, or analytics.
- Cursive / joined handwriting (`aan-elkaar` schrift). Only blokletters.
- Multi-language content beyond Dutch (the engine is language-agnostic, but the
  base dataset and copy are Dutch).
- Deployment/hosting (already handled — see repo `deploy.yml`).
- Multi-profile / multi-child accounts (single local device profile is enough;
  keep the data model open to adding profiles later — see `02`).

## Note on the Dutch alphabet

Dutch uses the 26-letter Latin alphabet. The digraph **"ij"** is treated as a
letter in Dutch ordering and is worth including as an optional word-building
tile, but for tracing it is just `i` + `j`. Diacritics (ë, ï, é) appear in loan
words; include a small optional set but do not block the MVP on them. The MVP
base dataset is **a–z lowercase + A–Z uppercase + 0–9**.

## Success criteria

The MVP is "done" when, on the Tab S8:

1. A child can pick a letter and trace it with finger or S-Pen at a smooth frame
   rate (target 60 fps rendering; input sampling keeps up with the pen).
2. Tracing within tolerance advances a visible progress trail; wildly off-path
   input does not advance and gives gentle visual feedback.
3. Strokes must be traced in the correct **order** and rough **direction**; a
   stroke started at the wrong end or out of order is not accepted.
4. Completing all strokes triggers a clear celebration.
5. A parent can add a custom word via the editor, and it appears as a traceable
   exercise, surviving an app restart (persisted in IndexedDB).
6. With the network disabled after first load, everything above still works
   (installed PWA, offline).

## Constraints & principles

- **Vanilla TypeScript + Vite**, minimal dependencies (see `01`).
- **Offline-first**; network only for first load and updates.
- **Forgiving tolerances** tuned for small motor skills.
- **Deterministic, testable geometry** — the tracing/scoring core must be pure
  functions that can be unit-tested without a DOM (see `10`).
- Keep the codebase legible and modular so Claude Code on the web can extend it
  in small, well-scoped PRs.
