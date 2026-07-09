# 01 — Responsive sizing & focused tracing

Make the traced glyph a **comfortable size on any screen**, regardless of how
many glyphs the word/sum has, by adding a **focused single-glyph mode** and
choosing between it and the current **row mode** based on available space.

## Goal

- A glyph is never smaller than a comfortable minimum to trace with a finger.
- Long words and sums stay usable on a phone (portrait) and a tablet.
- Keep whole-word context visible (a compact progress strip).
- Reuse the engine's existing per-glyph advance; minimal churn.

## Two layout modes

### Row mode (current)

All glyphs across the canvas, scaled to fit (`layoutGlyphs`). Great when glyphs
stay large enough — keep it for single glyphs and short words on wide screens.

### Focused mode (new)

- The **active glyph fills** most of the canvas (like tracing a single letter).
- A compact **progress strip** shows the whole word/sum small: completed glyphs
  inked, the active one highlighted, upcoming ones faint — plus "3/5".
- On completion of a glyph, **auto-advance** (already implemented via `current`)
  and transition the next glyph in (slide/fade; respect
  `prefers-reduced-motion`).
- Result: trace size is independent of length.

The engine already traces one glyph at a time; focused mode changes **what the
canvas shows** (only the active glyph, full size) and adds the strip. The
`done`/`upcoming` glyphs move from the canvas into the strip.

## Mode selection (pure, testable)

Add `src/render/trace-layout.ts` (or extend `geometry/layout.ts`):

```ts
export interface TraceLayout {
  mode: 'row' | 'focused'
  /** glyph→canvas transform(s): one per glyph (row) or just the active (focused). */
  // …plus regions for canvas / strip / fingers (see 02)
}
export function chooseTraceMode(availW: number, availH: number, glyphCount: number): 'row' | 'focused'
```

- Compute the **row-mode glyph size**: reuse `layoutGlyphs(count, w, h)` and read
  `GLYPH_SIZE * scale` (CSS px per glyph).
- If that is **≥ `MIN_GLYPH_PX`** → `row`; else → `focused`.
- `glyphCount === 1` → always `row` (already a single full-size glyph).
- `MIN_GLYPH_PX` in `config.ts`, tuned on device (start ~200 CSS px). This is
  the one number that decides "too small".

Because it's pure, unit-test the thresholds (e.g. 5 glyphs at 360px wide →
focused; 3 glyphs at 1000px → row).

## Focused-mode rendering

- **Canvas:** render only the active glyph via a full-canvas transform (a
  1-glyph `layoutGlyphs(1, …)` fit). `drawWordScene` gains a focused path (or a
  new `drawFocusedGlyph`) that draws road + guide + trail + start dot for the
  active glyph only.
- **Progress strip (DOM):** a row of small glyph previews
  (`drawGlyphsPreview` per glyph, or one strip canvas) above or below the
  canvas, showing done/active/upcoming + the count. Keep it short (a few dozen
  px tall) so it barely costs height.
- **Word image (lt-02):** show it behind the active glyph faded, or in the strip
  — pick one; keep the reveal-on-complete.
- **Transitions:** on advance, slide the finished glyph into the strip / bring
  the next in. Optional; a simple redraw is fine for v1.

## Orientation & compact chrome

- **Portrait phone:** less width → focused triggers for sums and words ≥ ~3
  glyphs. The canvas should use most of the height.
- **Landscape:** more width → row fits more; the finger aid can go beside (see
  `02`).
- **Compact HUD/tray on small screens** (CSS media queries): smaller round
  buttons, drop the progress *text* (keep the strip's count), tighter padding,
  honour `env(safe-area-inset-*)` for notches/rounded corners.
- Recompute mode on resize/orientation (the `ResizeObserver` in `trace.ts`
  already fires; have it re-run `chooseTraceMode` and rebuild regions).

## Optional setting

- Consider a **"Grote letters"** toggle (force focused) for parents who prefer
  one-big-letter-at-a-time even on a tablet. Default: automatic.

## Testing

- **Unit:** `chooseTraceMode` across representative sizes/counts (phone portrait
  vs tablet landscape; 1/3/5 glyphs) and the `MIN_GLYPH_PX` boundary.
- **Browser (Playwright):** at a phone viewport (~360×780) open a 5-glyph sum
  and a 5-letter word → assert **focused mode** and that the active glyph's
  on-canvas size ≥ `MIN_GLYPH_PX`; screenshot portrait & landscape. At a tablet
  viewport, short words stay **row**. Verify auto-advance still completes the
  whole word/sum.
- **Device:** trace a sum and a longer word on the SM-S9xx; confirm comfortable
  size and that the progress strip keeps context.

## Decisions

- `MIN_GLYPH_PX` value (start ~200, tune on device).
- Strip position (above vs below the canvas) and how much context it shows.
- Auto-only vs a forced "grote letters" setting.
