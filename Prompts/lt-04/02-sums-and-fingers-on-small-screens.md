# 02 — Sums & the finger aid on small screens

The finger strip (`#fingers`) currently sits in a fixed block **below** the
canvas and shows **all** operands at once. On a small phone that stacks with the
already-small row-mode digits and leaves almost no room to trace. Make the
finger aid **adapt to the screen and the tracing mode** from `01`.

## Goal

- Keep the finger-counting help, but never let it crowd out tracing.
- Best experience on the phone: fingers help the *current* number without
  shrinking the trace area.

## Placement strategy (pure, testable)

Add `chooseFingerPlacement({ mode, availW, availH, isSum })`:

- **Focused mode (recommended for sums on phones): `contextual`.** Show only the
  **current operand's** hands, **large**, beside/under the single big digit.
  Hide hands while tracing the operator (`+`/`−`) and `=`. This yields a clean
  pedagogical flow:

  `trace "2" (✋ 2 fingers) → "+" → trace "3" (✋ 3 fingers) → "=" → "5"`

  Optionally reveal the **result** hands on completion (ties to the lt-03
  result-reveal decision).
- **Row mode, wide/landscape: `beside`.** Put the hands in a column to the
  **left/right of the canvas** instead of below, so they don't steal height.
- **Row mode, portrait small: `below-compact`** (a single tight row) or fall
  through to focused (preferred).
- **Very small / user preference: `hidden`** (respect a `fingerHints` setting).

Pure and unit-testable; the trace screen positions the `#fingers` region
accordingly.

## Contextual hands need per-glyph meaning

Sum glyphs are `[…a, op, …b, '=', …result]`. To show the right hands while
tracing a given glyph, derive metadata from `item.sum`:

```ts
type SumGlyphRole =
  | { kind: 'operand'; which: 'a' | 'b'; value: number }
  | { kind: 'op' } | { kind: 'equals' } | { kind: 'result'; value: number }
export function sumGlyphRoles(sum: {a;op;b;result}): SumGlyphRole[]  // one per glyph
```

- In focused mode, when the active glyph's role is an **operand**, render
  `handsForCount(value)` (from `model/fingers.ts`) prominently; for `op`/`equals`
  show nothing; for `result` show it only after completion (reward).
- **Multi-digit** operands/results (e.g. 12, 13): keep the finger aid to
  **single-digit operands** for now (the common case); show a multi-digit
  result's hands, if at all, only on the completion reveal. Flag as a decision.

## Sizing & layout

- In `contextual` placement only one hand set is visible, so it can be **larger**
  and clearer (better for the phone) — size it from the region, not a fixed clamp.
- In `beside` placement, hands stack vertically in a side column sized to the
  canvas height.
- Keep hands themed via the `--hand` token (light/dark already added in lt-03).

## Settings

- Add/observe a **`fingerHints`** toggle (flagged in lt-03) so a parent can turn
  the aid off entirely on a tiny screen. Default on.
- Placement is automatic from the strategy above (no user control needed).

## Interaction with `01`

- This depends on the **modes** from `01`. Implement `01` first; then the finger
  region is just another region the layout controller positions (`below`,
  `beside`, `contextual`, or `hidden`).
- The `#fingers` element and `handGroup()` rendering in `trace.ts` are reused;
  only *what* is shown (all vs contextual) and *where* changes.

## Testing

- **Unit:** `chooseFingerPlacement` for phone-portrait sum (→ contextual),
  tablet-landscape sum (→ beside), tiny/hidden; `sumGlyphRoles` for `2+3=5` and a
  subtraction.
- **Browser:** phone viewport sum in focused mode → assert the current operand's
  hands show (and switch when advancing to the next operand), the operator glyph
  shows none, and the trace area is comfortably large; tablet → beside/below.
- **Device:** confirm on the SM-S9xx that a sum is comfortable and the hands
  still help.

## Decisions

- Contextual per-operand (recommended) vs always-all.
- Reveal the **result** hands on completion?
- Subtraction depiction (from lt-03): plain operands vs a take-away visual.
- Multi-digit operands/results handling for the finger aid.
