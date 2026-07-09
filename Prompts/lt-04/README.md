# lt-04 — Comfortable tracing on small screens

The app is used on both a **Galaxy Tab S8** (11", landscape-first) and a
**Galaxy S-series phone** (small, portrait). On the phone — especially for
**sums** and **longer words** — tracing becomes too small to use. This folder
plans how to make tracing comfortable on any screen. **Plans only — no code.**

## The problem

The whole exercise is laid out **all at once, scaled to fit** (`layoutGlyphs`
in `src/geometry/layout.ts`): more glyphs → each glyph is smaller. On top of
that, the **finger strip** for sums (`#fingers` in `src/ui/screens/trace.ts`)
takes a fixed block of height below the canvas. On a small phone the two
combine so a 5-glyph sum ("2 + 3 = 5") is tiny to trace.

Root causes:
1. Trace size is coupled to **glyph count** (row scales to fit width).
2. The **finger aid steals vertical space** from the canvas.
3. No adaptation to **small / portrait** screens.

## Strategy

1. **Focused single-glyph mode** — when the row would be too small, trace the
   **active glyph large** (filling the canvas) and show the whole word/sum in a
   compact **progress strip**. This decouples trace size from length and fixes
   both long words and sums. It largely reuses the engine's existing
   per-glyph auto-advance. → [`01-responsive-and-focused-tracing.md`](./01-responsive-and-focused-tracing.md)
2. **Adaptive finger aid** — in focused mode show **contextual** hands (just the
   operand being traced, large, beside the digit); in wide/landscape row mode
   put hands **beside** the canvas, not below; hide/toggle on the tiniest
   screens. → [`02-sums-and-fingers-on-small-screens.md`](./02-sums-and-fingers-on-small-screens.md)

Both hinge on a small, **pure, testable** layout decision (given size + glyph
count + type → mode + finger placement), so behaviour is predictable and
unit-tested; the visual/DOM parts are verified in the browser at phone and
tablet viewports.

## Device targets

| Device | Size | Orientation | Expected mode |
|---|---|---|---|
| Galaxy Tab S8 (SM-X700) | 11" | landscape-first | row when it fits; focused for very long words |
| Galaxy S-phone (SM-S9xx) | ~6" | portrait | focused for sums & words ≥ ~3 glyphs |

## Baseline this builds on

- `layoutGlyphs(count, w, h)` scales the row to fit (the thing to make adaptive).
- The trace engine already advances **one glyph at a time**
  (`current` in `trace.ts`); focused mode is mostly a rendering/layout change.
- `drawWordScene` draws all glyphs (active/done/upcoming) + the word image.
- Finger aid: `model/fingers.ts` + `render/hand.ts` + the `#fingers` strip.
- Responsive hooks already present: `ResizeObserver`, `env(safe-area-inset-*)`,
  `prefers-reduced-motion`.

## Suggested order

1. **`01`** — responsive sizing + focused mode (the core fix; helps words too).
2. **`02`** — finger-aid placement (depends on the modes from `01`).

## Decisions to confirm

- The **minimum comfortable glyph size** that triggers focused mode.
- Focused mode **automatic only**, or also a "grote letters" (big letters)
  setting a parent can force?
- In focused mode, how much whole-word context to keep (a small strip vs none).
- Finger aid: **contextual per-operand** (recommended) vs always showing all;
  and whether to reveal the **result** hands on completion (ties to lt-03).
