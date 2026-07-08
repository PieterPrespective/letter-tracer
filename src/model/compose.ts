// Compose traceable word / sum exercises at runtime from the base glyph
// library, so a parent can add content without editing code.
// See Prompts/lt-01/06-storage-and-content-editor.md.

import { glyphForChar } from './glyph-library'
import type { ContentItem, Glyph } from './types'

export type ComposeResult = { ok: true; item: ContentItem } | { ok: false; error: string }

function glyphsFor(chars: string[]): { glyphs: Glyph[] } | { missing: string } {
  const glyphs: Glyph[] = []
  for (const ch of chars) {
    const g = glyphForChar(ch)
    if (!g) return { missing: ch }
    glyphs.push(g)
  }
  return { glyphs }
}

/** Build a word exercise from typed text (letters only) + an optional emoji. */
export function composeWord(text: string, emoji?: string): ComposeResult {
  const word = text.trim()
  if (!word) return { ok: false, error: 'Typ een woord.' }
  if (!/^[a-zA-Z]+$/.test(word)) return { ok: false, error: 'Alleen letters (a–z).' }
  const res = glyphsFor([...word])
  if ('missing' in res) return { ok: false, error: `Geen letter voor '${res.missing}'.` }
  const item: ContentItem = {
    id: `word-${word.toLowerCase()}`,
    type: 'word',
    glyphs: res.glyphs,
    prompt: word,
    answer: word,
    tags: ['woord', 'eigen'],
    source: 'user',
  }
  const trimmedEmoji = emoji?.trim()
  if (trimmedEmoji) item.image = { kind: 'emoji', value: trimmedEmoji }
  return { ok: true, item }
}

/** Build a sum exercise "a op b = result" from operands. */
export function composeSum(a: number, op: '+' | '-', b: number): ComposeResult {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return { ok: false, error: 'Gebruik hele getallen ≥ 0.' }
  }
  const result = op === '+' ? a + b : a - b
  if (result < 0) return { ok: false, error: 'Het antwoord mag niet negatief zijn.' }
  const chars = [...String(a), op, ...String(b), '=', ...String(result)]
  const res = glyphsFor(chars)
  if ('missing' in res) return { ok: false, error: `Geen teken voor '${res.missing}'.` }
  return {
    ok: true,
    item: {
      id: `sum-${a}${op === '+' ? 'p' : 'm'}${b}`,
      type: 'sum',
      glyphs: res.glyphs,
      prompt: `${a} ${op} ${b} =`,
      answer: String(result),
      sum: { a, op, b, result },
      tags: ['som', 'eigen'],
      source: 'user',
    },
  }
}
