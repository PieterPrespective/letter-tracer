# lt-06 — "Kies" (choose) game modes for words & sums

A second way to practise words and sums that trains **recognition & recall**
instead of motor tracing. The child is shown a *meaning* — the word's picture,
or a sum shown as **hands of fingers** — and has to **assemble the answer** by
picking letters / numbers in **scroll-selectors**, then press **Controleer**
(Check). **Plans only — no code.**

## The idea

Tracing (the existing mode) teaches *how to form* a glyph. The new **Kies**
mode teaches *which* glyphs spell the word / make the number — the child
reads the picture and produces the spelling, or reads the fingers and produces
the number. The two modes reinforce each other.

### Word mode (Kies-woord)

- Show the word's **illustration** big (the emoji/image already on the item).
- Show **one scroll-selector per letter** of the word (e.g. `boom` → 4 wheels).
- The child scrolls each wheel to a letter and presses **Controleer**.
- Feedback marks **only the wrong slots** (never says what the right letter is)
  so the child re-thinks just those. Correct slots lock in green.
- **Toon antwoord** (Show answer) reveals the full spelling to avoid frustration.
- All slots correct → celebrate (reuse the trace celebration + Dutch pronunciation).

### Sum mode (Kies-som)

- Show the sum as **hands of fingers** (reuse the lt-03 finger aid) — e.g.
  `5 + 2` as a hand of 5 and a hand of 2 — with the **digits hidden**.
- The child picks the **answer number** in a scroll-selector (one wheel per
  answer digit; single-digit today, multi-digit ready).
- Same **Controleer** / **Toon antwoord** / celebrate flow.

## Why a separate mode, not a rewrite

It's additive: the content model (`ContentItem`), the finger aid
(`model/fingers.ts` + `render/hand.ts`), word images, celebration
(`render/feedback.ts`), audio (`util/audio.ts`) and Dutch pronunciation
(`util/speech.ts` + `model/pronounce.ts`) are all reused. The only genuinely
new pieces are a **pure puzzle model** and a **scroll-selector component**.

## Plan files

1. **[`01-select-game-model.md`](./01-select-game-model.md)** — the pure,
   unit-tested model: turn a word/sum `ContentItem` into a puzzle (slots +
   correct values + candidate pools) and a checker that reports **per-slot**
   correctness. No DOM.
2. **[`02-scroll-selector-component.md`](./02-scroll-selector-component.md)** —
   the reusable kid-friendly **wheel picker** (touch/drag/flick, snap, big
   targets, keyboard + a11y), emitting the current value.
3. **[`03-word-and-sum-choose-screens.md`](./03-word-and-sum-choose-screens.md)**
   — the **Kies** screen(s) wiring image/hands + selectors + Controleer /
   Toon antwoord + feedback, and how the child enters the mode from home.

## Scope / non-goals

- **In scope:** word & sum Kies modes; wrong-slot-only feedback; show-answer;
  reuse of existing image/finger/celebration/audio systems; offline; a11y.
- **Out of scope:** letter/number single-glyph Kies (tracing already covers
  those); new content types; scoring/progress persistence (kept generous &
  stateless like tracing); drag-and-drop tiles (scroll-selector is the chosen
  interaction).

## Test-driven & CI-frugal (unchanged policy)

- All puzzle logic lives in `model/select-game.ts` and is covered by Vitest;
  the scroll-selector's snap math is pure and unit-tested too.
- DOM/interaction is verified in headless Chromium locally (as with prior
  milestones), not in CI, to stay conservative with Actions minutes. CI keeps
  running `npm run check` on PRs and test+deploy on main only.

## Decisions to confirm

1. **Sum mode target** — pick the **result** from operand-hands (recommended),
   or show result-hands and pick the number? (Plan assumes: show **operand**
   hands, pick the **result**, matching lt-03 finger counting.)
2. **Candidate pool per letter wheel** — full **a–z** (recommended, simplest &
   honest), or a **shuffled shortlist** (the correct letter + a few distractors)
   to make young children succeed faster?
3. **Mode entry** — a per-item **Overtrekken / Kiezen** toggle on the trace
   screen (recommended), a **home-screen** switch per category, or both?
4. **Wrong-slot feedback style** — colour only (recommended) vs colour + gentle
   shake; and whether to **auto-pronounce** the word on a wrong check as a hint.
5. **Letter case** — word wheels offer **lowercase** only (recommended) since
   base words are lowercase.
