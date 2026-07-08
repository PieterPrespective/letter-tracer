# 03 — Stroke Data & Dutch Pedagogy

The quality of the whole app rests on **good stroke data**: correct shapes,
correct **start points**, correct **direction** (schrijfrichting), and correct
**stroke order**. This document covers where the geometry comes from and how to
annotate it for the Dutch **Pennenstreken/blokletters** method.

## Sourcing the base geometry

**Primary source: Hershey single-stroke fonts** (public domain). These provide
clean single-line (centre-line) paths for the Latin alphabet and digits —
exactly the "one continuous movement where possible" character of blokletters.

- Distributed as SVG via the Inkscape / Evil Mad Scientist "Hershey Text"
  project, and as a JavaScript port ("Hershey Text in JS").
- License: public domain — safe to fork and redistribute in this repo.
- Pick a **sans / simplex** Hershey face (e.g. "Sans 1-stroke" / "Simplex"), not
  a serif or script face, to match blokletters.

**Process to get from Hershey → our model:**

1. Extract each glyph's polylines for the target character set (a–z, A–Z, 0–9,
   `+`, `-`, `=`).
2. Normalise into the `0..1000` glyph box (uniform scale, centre, consistent
   baseline/cap-height so glyphs sit together in words).
3. Flatten any curves to polylines at a tolerance fine enough that
   distance-to-path stays smooth (target segment length ≤ ~15 units).
4. Resample to a roughly uniform spacing (see `geometry/polyline.ts`
   `resample()`), which makes arc-length progress and tolerance behave evenly.
5. **Re-annotate** each glyph with the pedagogically correct start point, stroke
   direction, and stroke order (next section) — Hershey's plotting order is *not*
   pedagogical and must be fixed by hand.

Keep a small offline **generator script** (`scripts/build-glyphs.ts`, run with
`tsx`/`node`, not shipped) that performs steps 1–4 and emits a draft
`base-content.json`. Human annotation (step 5) is then applied and committed.
Document the exact Hershey source file and face used, for reproducibility.

> Also acceptable: fork an existing open-source letter-tracing project's stroke
> data as a cross-reference, but verify its license before copying data.

## Dutch schrijfrichting & stroke order (Pennenstreken / blokletters)

Target **blokschrift** (unjoined print letters) as taught from **groep 3** by the
**Pennenstreken** method (Zwijsen). Key pedagogy the data must encode:

- **Defined start and stop points** per letter, and correct **writing direction**.
- **"One continuous movement where possible."** Many blokletters are one stroke;
  those that aren't (e.g. `k`, `t`, `f`, `x`, capitals like `A`, `E`, `H`) have a
  small, defined number of strokes in a defined order.
- Canonical example from the blueprint: the letter **`a` starts at the
  right-middle** and moves so the bowl closes correctly — encode that as the
  stroke's first point and direction, not just the shape.

Because exact per-letter Pennenstreken stroke conventions are a pedagogical
detail (and editions differ), treat the stroke-order/direction annotations as
**data to be reviewed by a Dutch teacher/parent**, and make them trivially
editable:

- Store direction implicitly as the **order of `points`** in each `Stroke`
  (first point = start = where the child must begin).
- Store multi-stroke order implicitly as the **order of `strokes`** in each
  `Glyph`.
- Provide a **debug/authoring overlay** (see `07`) that draws the start dot,
  direction arrows, and stroke numbers, so a reviewer can visually confirm every
  glyph and flag corrections.

### A pragmatic annotation workflow

1. Auto-generate draft glyphs from Hershey.
2. Render every glyph in the authoring overlay (start dot + arrows + numbers).
3. A Dutch-speaking reviewer walks the alphabet, correcting: start point,
   direction (reverse a stroke's point list), and stroke order (reorder strokes).
   Splitting/merging strokes is an edit to the points arrays.
4. Commit the reviewed `base-content.json`. Record open questions (letters whose
   convention is uncertain) in a checklist.

### Letters needing explicit attention (multi-stroke or ambiguous start)

Non-exhaustive list to review carefully:

- Lowercase: `a b d f g i j k p q t x y` (dots on `i/j`, cross-bars on `f/t`,
  bowls that must close in a specific direction).
- Uppercase: `A B E F H I K M N R T X Y` (bars and multiple limbs).
- Digits: `4 5 7` (multi-stroke or direction-sensitive).
- Operators: `+ =` are two strokes each; `-` is one.

## Sizing & metrics for words

To make words look right when glyphs are composed:

- Establish a shared **baseline**, **x-height**, and **cap-height** in glyph
  space (e.g. baseline y=800, x-height top y=350, cap top y=150). Fit each glyph
  to these so `k a t` align on one baseline.
- Descenders (`g j p q y`) drop below the baseline; reserve space (e.g. down to
  y=950) so they aren't clipped.
- Store these advisory numbers in `Glyph.metrics` where they differ from
  defaults; otherwise rely on config defaults.

## Deliverables for this area

- `scripts/build-glyphs.ts` — Hershey → draft glyphs (offline, dev-only).
- `src/data/base-content.json` — reviewed, annotated base pack (letters, digits,
  operators) with correct start/direction/order.
- `src/model/glyph-library.ts` helper — `char -> Glyph` lookup built from the
  base pack, used to compose words/sums.
- A short `GLYPH-REVIEW.md` checklist tracking which glyphs are teacher-reviewed.
