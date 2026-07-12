# lt-06 / 03 — The "Kies" screen (words & sums)

Wires the pure puzzle (`01`) and the scroll-selector (`02`) into a playable
screen, and defines how the child gets there. One screen handles both word and
sum puzzles because they differ only in the **prompt** (image vs finger-hands)
and the **candidate pool** — both already encoded in `SelectPuzzle`.

## New file: `src/ui/screens/choose.ts`

```ts
export interface ChooseScreenOptions {
  item: ContentItem
  onBack: () => void
  onDone?: () => void   // after a solved celebration (for "next")
}
export function createChooseScreen(root: HTMLElement, opts: ChooseScreenOptions): { destroy(): void }
```

### Layout (top → bottom)

1. **HUD**: back button + title (the category), a speaker button (`#say`)
   reusing `pronounceItem(item)`, and a **mode toggle** back to tracing
   (see "Entering the mode").
2. **Prompt area**:
   - `prompt.kind === 'image'` → the word illustration, large and centered
     (reuse the emoji/image rendering used behind the canvas in
     `render/glyph-renderer.ts`; factor the emoji-draw into a tiny helper or
     just render the emoji/`<img>` in the DOM here). **No letters shown.**
   - `prompt.kind === 'fingers'` → the operand hands via `handsForCount(a)` and
     `handsForCount(b)` + `handSVG` (reuse lt-03's `render/hand.ts`), with the
     operator glyph between them. **The result is hidden.**
3. **Selector row**: one `createScrollSelector` per `puzzle.slots[i]`, laid out
   left→right; wraps to a second line if it would overflow (long words on a
   phone). Each wheel gets `ariaLabel` "Letter i van n" / "Cijfer i van n".
4. **Actions**: **Controleer** (primary) and **Toon antwoord** (ghost).

### Behaviour

- **Controleer** → `checkPuzzle(puzzle, picks)`:
  - Mark each wheel `correct` / `wrong` via `setState`. Correct wheels **lock**.
  - Only wrong slots stay actionable; the child adjusts and checks again.
  - If `isSolved` → celebrate: reuse `FeedbackLayer` star burst + `playCelebrate`
    (`util/audio.ts`) + `pronounceItem(item)` (say the word / the sum in words),
    then offer **Volgende** (next) via `onDone`.
  - Optional (README decision 4): on a wrong check, `speak` the word as a hint.
- **Toon antwoord** → for each slot `setValue(answer, {animate:true})` and mark
  all `correct` (locked), then run the same celebration **without** star spam
  (a softer "answer shown" state) so it relieves frustration without rewarding
  it like a solve. Pronounce the answer.
- **State is ephemeral** — like tracing, nothing is persisted; reopening the
  item starts fresh. Keep it generous and pressure-free (no timer, no score).

### Reuse map (no new subsystems)

| Need | Reuse |
|---|---|
| Word picture | image rendering from `render/glyph-renderer.ts` / `item.image` |
| Finger hands | `model/fingers.ts` + `render/hand.ts` (lt-03) |
| Celebration | `render/feedback.ts` |
| Sound / voice | `util/audio.ts`, `util/speech.ts` (`pronounceItem`), `model/pronounce.ts` |
| Theme | `src/theme.ts` tokens + `src/style.css` |
| Puzzle logic | `model/select-game.ts` (`01`) |
| Wheel | `ui/components/scroll-selector.ts` (`02`) |

## Entering the mode

Recommended: a **per-item toggle** so a child can switch how they practise the
same word/sum.

- On the **trace screen** (`src/ui/screens/trace.ts`), add a small segmented
  control **Overtrekken / Kiezen** in the HUD, shown only for `word` and `sum`
  items (and, for words, only when an image exists). Selecting **Kiezen** tears
  down the trace screen and mounts `createChooseScreen` for the same item;
  **Overtrekken** does the reverse.
- Plumb this through `src/app.ts` (`showTrace` gains a `mode` and mounts the
  right screen), so deep-links can pick a mode too: `?char=…` stays tracing;
  add `?mode=kies` for the choose screen (nice for testing/verification).
- **Home screen** unchanged except: word/sum tiles keep opening in the child's
  last-used mode (store `lastMode` in `state/settings.ts`, default
  `overtrekken`) so it's predictable.

## `state/settings.ts` addition

```ts
mode: 'overtrekken' | 'kiezen'   // last-used practice mode, default 'overtrekken'
```

Small, localStorage-backed like the rest; not a behavioural gate (both modes
always available), just a sensible default when opening a tile.

## Verification (browser, local — not CI)

- **Word (`boom`)**: image shows, 4 wheels, no letters revealed. Set
  `b,o,o,n` → Controleer marks **only slot 4** wrong; fix to `m` → solve →
  celebration + "boom" spoken.
- **Sum (`5 - 2`)**: hands show 5 and 2, result hidden; pick `4` → wrong; pick
  `3` → solve → "vijf min twee is drie".
- **Toon antwoord** fills the correct values, locks wheels, pronounces, relieves
  without a full star celebration.
- Wrong check **never** renders the correct letter/number anywhere in the DOM
  (matches the model guarantee from `01`).
- Phone portrait (~360 wide): wheels wrap and stay ≥ min touch size; tablet
  landscape: single row. Dark mode + reduced-motion correct.
- Mode toggle round-trips trace ⇄ kies for the same item without leaks/listeners
  left behind (teardown parity with existing screens).

## Rollout order

1. `model/select-game.ts` + tests (`01`).
2. `ui/components/scroll-selector.ts` + `wheel-snap` tests (`02`).
3. `ui/screens/choose.ts` + entry toggle + settings (`03`), verify in browser.
4. Merge to main (deploys). Keep CI on `npm run check` only, per policy.
