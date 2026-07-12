// The "Kies" (choose) game model: turn a word/sum ContentItem into a puzzle
// (one wheel-slot per letter/digit of the answer) and check a child's picks.
// Pure and unit-tested — the UI (scroll selectors + screen) layers on top.
//
// Design note: `checkPuzzle` returns ONLY per-slot correctness, never the
// expected value, so the "show only which slot is wrong" rule is a structural
// guarantee. The answer is reachable solely via `puzzle.answer` (the explicit
// "Toon antwoord" button). See Prompts/lt-06/01-select-game-model.md.

import type { ContentItem, WordImage } from './types'

export type SelectKind = 'letter' | 'digit'

/** One wheel: its candidate values and the value that is correct. */
export interface SelectSlot {
  kind: SelectKind
  /** Ordered candidate values shown in the wheel (e.g. a–z or 0–9). */
  choices: string[]
  /** The correct value for this slot (always a member of `choices`). */
  answer: string
}

/** What the child sees as the prompt: a word picture, or a sum as finger-hands. */
export type SelectPrompt =
  | { kind: 'image'; image: WordImage; word: string }
  | { kind: 'fingers'; a: number; op: '+' | '-'; b: number; result: number }

export interface SelectPuzzle {
  itemId: string
  type: 'word' | 'sum'
  slots: SelectSlot[]
  /** The full correct string, for the "Toon antwoord" button. */
  answer: string
  prompt: SelectPrompt
}

/** Per-slot check result. Deliberately carries no expected value. */
export interface SlotResult {
  index: number
  correct: boolean
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const DIGITS = '0123456789'.split('')

/** Which items support the choose mode (words, and sums with sum data). */
export function canChoose(item: ContentItem): boolean {
  return item.type === 'word' || (item.type === 'sum' && !!item.sum)
}

/** One lowercase-letter slot per character of the word. */
export function wordPuzzle(item: ContentItem): SelectPuzzle {
  const word = item.prompt.toLowerCase()
  const slots: SelectSlot[] = [...word].map((ch) => ({ kind: 'letter', choices: LETTERS, answer: ch }))
  // Fall back to a neutral picture so the mode still works; home only offers
  // Kies for words that actually carry an illustration.
  const image: WordImage = item.image ?? { kind: 'emoji', value: '❓' }
  return { itemId: item.id, type: 'word', slots, answer: word, prompt: { kind: 'image', image, word } }
}

/** One digit slot per digit of the result (single today; multi-digit ready). */
export function sumPuzzle(item: ContentItem): SelectPuzzle {
  if (!item.sum) throw new Error(`sumPuzzle: item ${item.id} has no sum`)
  const { a, op, b, result } = item.sum
  const digits = String(result)
  const slots: SelectSlot[] = [...digits].map((d) => ({ kind: 'digit', choices: DIGITS, answer: d }))
  return { itemId: item.id, type: 'sum', slots, answer: digits, prompt: { kind: 'fingers', a, op, b, result } }
}

/** Dispatch on item type; throws for types the mode doesn't support. */
export function buildPuzzle(item: ContentItem): SelectPuzzle {
  if (item.type === 'word') return wordPuzzle(item)
  if (item.type === 'sum') return sumPuzzle(item)
  throw new Error(`buildPuzzle: unsupported type ${item.type}`)
}

/** Compare picks (one per slot) to the answers; a missing pick is not correct. */
export function checkPuzzle(puzzle: SelectPuzzle, picks: string[]): SlotResult[] {
  return puzzle.slots.map((slot, index) => ({ index, correct: picks[index] === slot.answer }))
}

export function isSolved(results: SlotResult[]): boolean {
  return results.length > 0 && results.every((r) => r.correct)
}
