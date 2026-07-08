# lt-03 — Finger-counting sums & Dutch pronunciation fix

Third round of features, on top of lt-01 (the app) and lt-02 (dark mode, word
images, pronunciation phase 1). **Plans only — no code yet.**

## Requested

1. **Finger-counting for sums** — show hands with the right number of fingers
   extended for each number in a sum (e.g. 7 = a hand of 5 + a hand of 2), so a
   child can count along. → [`01-finger-counting-sums.md`](./01-finger-counting-sums.md)
2. **Fix Dutch pronunciation** — TTS currently reads Dutch words with an English
   voice ("vijf" → "vi-jive" instead of "vaif"). Select a real Dutch voice, and
   fall back to bundled Dutch number clips so counting is always correct.
   → [`02-dutch-pronunciation-fix.md`](./02-dutch-pronunciation-fix.md)

## Baseline these build on

- Sums are `ContentItem`s of `type: 'sum'` with a `sum: { a, op, b, result }`
  descriptor (`src/model/types.ts`); rendered as traceable glyphs on the trace
  screen (`src/ui/screens/trace.ts` → `drawWordScene`).
- Pronunciation: `src/model/pronounce.ts` (text mapping) + `src/util/speech.ts`
  (Web Speech nl-NL wrapper), gated by a `speech` setting. `ContentItem.audioSrc`
  is reserved for bundled clips (was deferred in lt-02 phase 1).
- Offline PWA (`vite-plugin-pwa`): any new asset must be bundled/precached.
- Theming via CSS tokens + `src/theme.ts` (new visuals must work in dark mode).

## The two features reinforce the same use case

Both serve the **sums / counting** experience: finger hands make the quantity
concrete, and correct Dutch number audio ("vijf") reinforces it. Bundled
**number-word clips** (feature 2) are the highest-value, lowest-risk fix and
also double as pronunciation phase-2 groundwork.

## Suggested order

1. **Dutch pronunciation fix** (feature 2) — robust nl voice selection is small
   and fixes a live annoyance; number clips make counting audio bullet-proof.
2. **Finger-counting sums** (feature 1) — a new visual aid; larger but
   self-contained.

## Decisions to confirm

- Finger aid: **operands only**, or also the **result** (reveal on completion)?
  And how to depict **subtraction** (take-away)? See `01`.
- Hand rendering: **parametric SVG** (recommended) vs a bundled image set.
- Pronunciation: ship **bundled number clips** now (recommended), or rely only
  on device Dutch voices? See `02`.
