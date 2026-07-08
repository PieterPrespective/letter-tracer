# 02 — Data Model

All stroke geometry is stored in **glyph space** (integer `0..1000`, y-down;
see `01`). The model is intentionally small and versioned so the base dataset and
user content share one shape.

## Core types

```ts
// model/types.ts

export type Point = { x: number; y: number };   // glyph space, 0..1000

/** One pen-down..pen-up stroke: an ordered polyline the child must trace. */
export interface Stroke {
  /** Ordered path points. Direction encodes schrijfrichting (start -> end). */
  points: Point[];
  /** Optional per-stroke tolerance override (fraction of 1000). */
  tolerance?: number;
  /** Optional hint text/arrow label, e.g. "van boven naar beneden". */
  hint?: string;
}

/** A single character with its ordered strokes. */
export interface Glyph {
  char: string;               // "a", "A", "5", "+", "="
  strokes: Stroke[];          // ordered; index = required stroke order
  /** Advisory pen-lift baseline metrics for consistent sizing across glyphs. */
  metrics?: { baseline: number; xHeight: number; capHeight: number };
}

export type ContentType = 'letter' | 'number' | 'word' | 'sum';

/** A traceable exercise: one or more glyphs laid left-to-right. */
export interface ContentItem {
  id: string;                 // stable id, e.g. "letter-a-lower"
  type: ContentType;
  /** Glyphs in display order (a word is several glyphs). */
  glyphs: Glyph[];
  prompt: string;             // what to show/say: "a", "kat", "2 + 3 ="
  answer: string;             // expected result string: "a", "kat", "5"
  /** For 'sum': the operands/operator, kept for rendering/generation. */
  sum?: { a: number; op: '+' | '-'; b: number; result: number };
  tags?: string[];            // "group3", "klinker", "eigen"
  source: 'base' | 'user';    // provenance; user items are editable/deletable
}
```

### Relationship to the blueprint schema

The blueprint sketched:

```json
{ "type":"letter|number|word|sum",
  "glyphs":[ { "char":"a", "strokes":[ [ {"x":0,"y":0} ] ] } ],
  "prompt":"a", "answer":"a" }
```

The model above is a strict superset: `strokes` becomes `{points, tolerance?,
hint?}` objects instead of bare point arrays, gaining per-stroke tolerance and
pedagogy hints while keeping the same nesting. A migration/loader accepts the
bare-array form and upgrades it (see "Versioning").

## Content pack (file/import format)

Base data and importable/exportable user packs share one envelope:

```ts
export interface ContentPack {
  schemaVersion: number;      // integer, currently 1
  name: string;               // "Basis Nederlands", "Mijn woorden"
  locale: string;             // "nl-NL"
  items: ContentItem[];
}
```

- `data/base-content.json` is a `ContentPack` with `source: 'base'` items.
- The editor exports user content as a `ContentPack` file (download) and imports
  the same (validated) format. This is the offline "sync" story.

## Words & sums as composed glyphs

- A **word** is a `ContentItem` whose `glyphs` array is the letters in order.
  The renderer lays them out left-to-right using each glyph's advance width
  (default: fixed cell of 1000 wide with side bearings; refine with `metrics`).
- A **sum** is a `ContentItem` with `type: 'sum'` and a `sum` descriptor. Its
  `glyphs` render the digits/operator/`=` and the answer digits. Two authoring
  modes:
  - **Generated:** given `{a, op, b}`, compose glyphs from the digit/operator
    glyph library. The child traces the whole line including the answer.
  - **Explicit:** author provides glyphs directly (rare; for special cases).
- Keep a **glyph library** (`char -> Glyph`) derived from the letter/number base
  content so words and sums can be assembled without re-authoring each glyph.

## Multi-glyph layout

Layout is computed at render time, not stored:

- Each glyph occupies a cell; cells are packed left-to-right with a configurable
  gap (`config.wordLetterSpacing`).
- The whole line is scaled to fit the canvas trace area with padding.
- The active glyph (the one currently being traced) may be highlighted/scaled;
  the tracing engine only ever runs one glyph at a time, advancing left→right.

## Versioning & migration

- `ContentPack.schemaVersion` starts at **1**.
- `model/schema.ts` exposes `validatePack(json): ContentPack` and
  `migratePack(json): ContentPack`:
  - Accepts legacy `strokes: Point[][]` and wraps each into `{ points }`.
  - Fills defaults (`source`, empty `tags`).
  - Rejects unknown future `schemaVersion` with a clear error surfaced in the UI.
- IndexedDB stores its own DB version (see `06`); bump it independently of
  content `schemaVersion`.

## Validation rules (enforced by `schema.ts`)

- Every `Stroke.points` has **≥ 2** points; all coords in `[0, 1000]`.
- `Glyph.strokes` non-empty; `char` is a single grapheme.
- `ContentItem.id` unique within a pack; `type` valid; `word`/`sum` have ≥1 glyph.
- `sum.result` equals `a op b` (guard against authoring errors).
- Invalid items are dropped with a collected warning list (don't hard-fail the
  whole pack on one bad item, except for `schemaVersion` mismatch).
