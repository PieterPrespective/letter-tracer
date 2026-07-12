# lt-06 / 02 — Scroll-selector (wheel picker) component

A reusable, kid-friendly **vertical wheel** for choosing one value from a list
(a letter or a digit). One instance per puzzle slot. Touch-first (finger + thumb
flicks on a phone), works with the S-Pen and keyboard, and is theme-aware.

## New file: `src/ui/components/scroll-selector.ts`

### API

```ts
export interface ScrollSelectorOptions {
  choices: string[]
  initial?: string        // default: first choice
  ariaLabel: string       // e.g. "Letter 1 van 4"
  onChange?: (value: string) => void
}

export interface ScrollSelector {
  el: HTMLElement
  value(): string
  setValue(v: string, opts?: { animate?: boolean }): void  // used by "Toon antwoord"
  setState(state: 'idle' | 'correct' | 'wrong'): void       // used by "Controleer"
  destroy(): void
}

export function createScrollSelector(opts: ScrollSelectorOptions): ScrollSelector
```

### Structure & interaction

- A fixed-height **viewport** (`overflow: hidden`) showing ~3 items; the
  **center row** is the selection (framed by a highlight band). Items above/below
  are dimmed and slightly smaller for a wheel feel.
- Implemented as a translated **track** of item rows. Prefer **native scroll**
  (`overflow-y: auto; scroll-snap-type: y mandatory` with each item
  `scroll-snap-align: center`) — the browser does the flick physics and snapping
  for free, is smooth on Android, and needs no pointer math. Read the selected
  value from `scrollTop` on `scrollend` (fallback: debounced `scroll`).
- **Big targets:** each item ≥ the min touch size; tapping an off-center item
  scrolls it to center (`scrollIntoView({block:'center'})`).
- **Buttons for precision:** small ▲ / ▼ buttons above/below step one item —
  essential for accuracy on a wheel and for anyone who finds flicking fiddly.
- **Keyboard/a11y:** the viewport is a `role="listbox"` (options
  `role="option"`, `aria-selected`); Arrow↑/↓ step, Home/End jump, and it's
  focusable. `ariaLabel` names the slot ("Letter 2 van 4").
- **Optional wrap** for letters (z → a) — nice-to-have; native snap doesn't wrap,
  so leave off in v1 unless flicking to far letters proves annoying.

### Visual states (`setState`)

- `idle` — neutral highlight band.
- `correct` — green band + a small ✓; **lock** it (disable scrolling) so solved
  slots stay put.
- `wrong` — red/amber band (optional one-shot shake, respecting
  `prefers-reduced-motion`); stays interactive so the child can change it.

Colours come from **CSS custom properties** (reuse the theme tokens in
`src/theme.ts` / `src/style.css`, add `--ok` / `--bad` if not present) so light
and dark both work, matching the rest of the app.

## Pure bit to unit-test: `src/ui/components/wheel-snap.ts`

Keep the DOM out of the arithmetic so it's testable:

```ts
/** Nearest item index for a given scroll offset. */
export function indexForOffset(scrollTop: number, itemHeight: number, count: number): number
/** Scroll offset that centers an item index. */
export function offsetForIndex(index: number, itemHeight: number): number
```

- Tests: round-trips (`indexForOffset(offsetForIndex(i)) === i`), clamping at
  both ends, and mid-item offsets snapping to the nearer index. This is the only
  logic that can be subtly wrong; the rest is CSS + native scroll.

## Verification (browser, local — not CI)

At a phone viewport (~360×740) and a tablet viewport:
- flick scrolls and **snaps** to a single centered item;
- ▲/▼ step exactly one;
- `setState('correct')` locks and greens the wheel; `setState('wrong')` reds it
  and it's still scrollable;
- `setValue` animates to the target (used by Toon antwoord);
- dark mode colours are correct; reduced-motion disables the shake.

## Why native scroll-snap over a custom drag engine

The app already prefers small, robust primitives. Native
`scroll-snap` + `scrollend` gives correct Android flick physics, momentum, and
accessibility with far less code and no pointer-capture edge cases — the wheel
is presentation; the truth stays in the pure model from `01`.
