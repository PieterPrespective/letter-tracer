# 01 — Finger-counting for sums

Show hands with the right number of fingers extended for each number in a sum,
so a child who counts on their fingers can count along. E.g. **7 = a hand of 5
+ a hand of 2**.

## Goal & scope

- On a **sum** exercise, display hands illustrating the operands (and,
  optionally, the result).
- A number 1–5 → one hand with that many fingers; 6–10 → two hands (5 + rest).
- Purely a visual aid; it never affects tracing or scoring.
- Offline, themeable (dark mode), no licensing concerns.

## Number → hands

Pure helper (e.g. `src/model/fingers.ts`), unit-tested:

```ts
export interface HandSpec { fingers: number; hand: 'left' | 'right' }
/** Decompose a count (0..10) into 1–2 hands of ≤5 fingers. */
export function handsForCount(n: number): HandSpec[]
```

- `0` → one open-palm hand with 0 fingers (a fist).
- `1..5` → `[{ fingers: n }]`.
- `6..10` → `[{ fingers: 5 }, { fingers: n - 5 }]`.
- Operands in the base sums are ≤9, so at most two hands each. (The **result**
  can reach up to 18; if we ever show result hands, cap/΄chunk into groups of 5
  — but see "operands vs result" below.)
- **Handedness:** the user prefers **right + left**. Suggest: the first
  (full/5) hand as one side and the remainder as the other. Confirm exact
  left/right convention; it's a one-line change.

## Rendering the hand

**Recommended: a parametric SVG hand** (`src/render/hand.ts` → returns an
`SVGElement` or an SVG string), because it's offline, scales crisply, themes via
`currentColor`, needs no assets, and no licensing.

- A stylised hand: a rounded **palm** + **5 finger** capsules + a **thumb** off
  the side. Extended fingers are drawn full-length; folded fingers are short
  stubs (or dots on the palm). This reads clearly without being anatomically
  fussy.
- `hand: 'right' | 'left'` mirrors horizontally (`transform: scaleX(-1)`).
- Fill from a theme token (e.g. a warm neutral `--hand`); outline in `--ink`.
  Add light/dark values in `style.css` (dark mode must stay legible).
- Accessibility: wrap each hand group with `role="img"` +
  `aria-label="hand met 2 vingers"`.

*Alternative:* a bundled SVG/PNG set (0–5 fingers, ×2 for handedness ≈ 12 tiny
files). Simpler to draw by hand but less flexible; parametric is preferred.

**Not emoji** — ✋/✌️ can't reliably show 1/3/4 fingers, so emoji is unsuitable
here (unlike word images, where it was ideal).

## Placement & layout (`src/ui/screens/trace.ts`)

- Only for `item.type === 'sum'`. Derive everything from `item.sum` — **no data
  model change**.
- Add a **finger strip** below the tracing canvas (in/near the `.tray`, above
  the message/next button): the operand groups laid out to mirror the sum, e.g.

  `[hands(a)]  +  [hands(b)]`

  Each group is 1–2 hands side by side. Keep it compact so it doesn't crowd the
  canvas on the Tab S8 (it can wrap below on portrait).
- The strip is static (recomputed on resize); it doesn't animate with tracing.

### Operands vs result

- **MVP:** show the **operands** (a and b). The point is for the child to count
  a fingers + b fingers and discover/confirm the result themselves.
- **Optional reward:** reveal the **result** hands on completion (mirrors the
  word-image reveal in lt-02) — a nice "…and that makes 5!" payoff. Flag as a
  decision.

### Subtraction (a − b)

Fingers for subtraction need a "take-away" idea, not two separate groups:

- **MVP:** show `a`'s hands, with `b` of the fingers **dimmed/greyed or
  crossed** to show them taken away; the remaining highlighted fingers = the
  result. (Alternatively show only `a`'s hands and let the reveal show the
  result hands.)
- Confirm the preferred depiction; addition is the simpler first target.

## Settings

- Default **on** for sums (the child prefers it). Optionally add a
  `fingerHints: boolean` setting with a toggle in the editor for parents who
  want the plain sum.

## Testing

- **Unit:** `handsForCount(n)` for 0–10 (counts, hand count, 5+rest split).
- **Visual (Playwright):** open a sum (`?char=` deep-link or a Sommen tile) and
  screenshot; confirm the hands match the operands, in light and dark; verify
  subtraction depiction.
- **Manual/device:** confirm hands are big enough to count at arm's length on
  the tablet.

## Open questions

- Operands only, or reveal the result too?
- Subtraction depiction (dim/cross vs result-only)?
- Exact left/right ordering for two-hand numbers.
- Parametric SVG hand vs a bundled hand image set (recommend parametric).
