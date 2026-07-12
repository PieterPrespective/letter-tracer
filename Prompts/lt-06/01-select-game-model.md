# lt-06 / 01 — Select-game model (pure, unit-tested)

The brain of the Kies mode, with **no DOM**. It turns a word/sum `ContentItem`
into a **puzzle** and checks a child's picks against it. Everything here is
pure and covered by Vitest, so the UI layers on top can stay thin.

## New file: `src/model/select-game.ts`

### Types

```ts
export type SelectKind = 'letter' | 'digit'

/** One wheel: its candidate values and the value that is correct. */
export interface SelectSlot {
  kind: SelectKind
  /** Ordered candidate values shown in the wheel (e.g. ['a'..'z'] or ['0'..'9']). */
  choices: string[]
  /** The correct value for this slot (always a member of `choices`). */
  answer: string
}

export interface SelectPuzzle {
  /** Source item id, for keying/telemetry. */
  itemId: string
  type: 'word' | 'sum'
  slots: SelectSlot[]
  /** The full correct string, for the "Toon antwoord" button. */
  answer: string
  /** What to show as the prompt: the word image, or the sum's operands. */
  prompt:
    | { kind: 'image'; image: WordImage; word: string }
    | { kind: 'fingers'; a: number; op: '+' | '-'; b: number; result: number }
}

/** Per-slot check result. `null` = not yet checked. */
export interface SlotResult {
  index: number
  correct: boolean
}
```

### Builders

```ts
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const DIGITS = '0123456789'.split('')

/** Build a puzzle from a word item: one letter slot per character. */
export function wordPuzzle(item: ContentItem): SelectPuzzle
```

- One `SelectSlot` per letter of `item.prompt` (lowercased).
- `choices = LETTERS` (see README decision 2 for the shortlist alternative —
  if adopted, `choices` is a shuffled `[answer, ...distractors]`; the shuffle
  must be **seeded from the item id** so it is deterministic and testable —
  `Math.random` is banned in this codebase's generators/tests anyway).
- `prompt = { kind: 'image', image: item.image ?? {emoji fallback}, word }`.
  If the item has no image, fall back to a neutral placeholder (e.g. `❓`) so
  the mode still works, but home should only offer Kies for words that have one.

```ts
/** Build a puzzle from a sum item: one digit slot per digit of the result. */
export function sumPuzzle(item: ContentItem): SelectPuzzle
```

- Requires `item.sum`. Slots = one `digit` slot per character of
  `String(result)` (single slot today; two slots for results ≥ 10).
- `choices = DIGITS`.
- `prompt = { kind: 'fingers', a, op, b, result }` — the screen renders the
  operand hands from this (reusing `handsForCount`).

```ts
/** Dispatch on item type; throws for unsupported types. */
export function buildPuzzle(item: ContentItem): SelectPuzzle
```

### Checker

```ts
/** Compare the child's picks (one per slot) to the answers. */
export function checkPuzzle(puzzle: SelectPuzzle, picks: string[]): SlotResult[]

/** Convenience: are all slots correct? */
export function isSolved(results: SlotResult[]): boolean
```

- `checkPuzzle` returns a `SlotResult` **per slot**; a slot with no pick yet
  (`picks[i] == null`) is `correct: false`.
- Crucially it returns **only correctness**, never the expected value — the UI
  must not be able to leak the answer on a wrong check (README decision 4). The
  answer is exposed **only** via `puzzle.answer`, used by the explicit
  "Toon antwoord" button.

## Tests — `src/model/select-game.test.ts`

- `wordPuzzle` for `boom` → 4 letter slots, answers `['b','o','o','m']`,
  each `choices` contains its answer, `answer === 'boom'`, prompt kind `image`.
- `wordPuzzle` lowercases and handles a repeated letter (`aap` → `a,a,p`).
- `sumPuzzle` for `5 - 2` → 1 digit slot, answer `['3']`, prompt kind
  `fingers` with `{a:5,op:'-',b:2,result:3}`.
- `sumPuzzle` for a two-digit result (construct `9 + 4 = 13`) → 2 slots
  `['1','3']` (guards the multi-digit path even though base content is small).
- `checkPuzzle`: all-correct picks → every `correct:true`, `isSolved` true.
- `checkPuzzle`: one wrong pick → exactly that index `false`, others `true`,
  and the result objects **do not contain** the expected letter (regression
  guard against answer-leak).
- `checkPuzzle`: missing pick (`undefined`) → that slot `false`, not a throw.
- If the seeded-shortlist option is taken: `wordPuzzle(item)` twice returns the
  **same** `choices` order (determinism), and `answer ∈ choices`.

## Why this shape

- Mirrors the existing pure-model + thin-UI split (`compose.ts`, `fingers.ts`,
  `pronounce.ts`) so it's testable in Node with no jsdom.
- Keeping the answer out of `SlotResult` makes the "only show which is wrong"
  requirement a **structural guarantee**, not a UI convention.
- Multi-digit sum support costs nothing now and avoids a rewrite if larger
  sums are added later.
