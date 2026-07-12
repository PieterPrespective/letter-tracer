import { describe, expect, it } from 'vitest'
import { buildPuzzle, checkPuzzle, canChoose, isSolved, sumPuzzle, wordPuzzle } from './select-game'
import type { ContentItem } from './types'

const base = { glyphs: [], source: 'base' as const }
const word = (prompt: string, image?: ContentItem['image']): ContentItem => ({
  ...base,
  id: `w-${prompt}`,
  type: 'word',
  prompt,
  answer: prompt,
  image,
})
const sum = (a: number, op: '+' | '-', b: number): ContentItem => ({
  ...base,
  id: `s-${a}${op}${b}`,
  type: 'sum',
  prompt: `${a} ${op} ${b} =`,
  answer: String(op === '+' ? a + b : a - b),
  sum: { a, op, b, result: op === '+' ? a + b : a - b },
})

describe('wordPuzzle', () => {
  it('makes one letter slot per character with a–z choices', () => {
    const p = wordPuzzle(word('boom', { kind: 'emoji', value: '🌳' }))
    expect(p.slots.map((s) => s.answer)).toEqual(['b', 'o', 'o', 'm'])
    expect(p.answer).toBe('boom')
    expect(p.prompt).toEqual({ kind: 'image', image: { kind: 'emoji', value: '🌳' }, word: 'boom' })
    for (const s of p.slots) {
      expect(s.kind).toBe('letter')
      expect(s.choices).toHaveLength(26)
      expect(s.choices).toContain(s.answer)
    }
  })

  it('lowercases and keeps repeated letters', () => {
    expect(wordPuzzle(word('AAP')).slots.map((s) => s.answer)).toEqual(['a', 'a', 'p'])
  })

  it('falls back to a neutral picture when the word has no image', () => {
    const p = wordPuzzle(word('vis'))
    expect(p.prompt.kind).toBe('image')
    if (p.prompt.kind === 'image') expect(p.prompt.image).toEqual({ kind: 'emoji', value: '❓' })
  })
})

describe('sumPuzzle', () => {
  it('makes one digit slot per result digit with 0–9 choices', () => {
    const p = sumPuzzle(sum(5, '-', 2))
    expect(p.slots.map((s) => s.answer)).toEqual(['3'])
    expect(p.slots[0].choices).toHaveLength(10)
    expect(p.prompt).toEqual({ kind: 'fingers', a: 5, op: '-', b: 2, result: 3 })
  })

  it('handles a two-digit result (multi-digit path)', () => {
    const p = sumPuzzle(sum(9, '+', 4))
    expect(p.slots.map((s) => s.answer)).toEqual(['1', '3'])
    expect(p.answer).toBe('13')
  })
})

describe('checkPuzzle / isSolved', () => {
  const p = wordPuzzle(word('boom'))

  it('marks all correct when picks match', () => {
    const r = checkPuzzle(p, ['b', 'o', 'o', 'm'])
    expect(r.every((x) => x.correct)).toBe(true)
    expect(isSolved(r)).toBe(true)
  })

  it('marks only the wrong slot and never leaks the answer', () => {
    const r = checkPuzzle(p, ['b', 'o', 'o', 'n'])
    expect(r.filter((x) => !x.correct).map((x) => x.index)).toEqual([3])
    expect(isSolved(r)).toBe(false)
    // A SlotResult must not carry the expected value.
    expect(Object.values(r[3])).not.toContain('m')
  })

  it('treats a missing pick as incorrect, not an error', () => {
    const r = checkPuzzle(p, ['b', 'o', 'o'])
    expect(r[3].correct).toBe(false)
  })
})

describe('canChoose / buildPuzzle', () => {
  it('accepts words and sums, rejects letters/numbers', () => {
    expect(canChoose(word('kat'))).toBe(true)
    expect(canChoose(sum(2, '+', 3))).toBe(true)
    expect(canChoose({ ...base, id: 'l-a', type: 'letter', prompt: 'a', answer: 'a' })).toBe(false)
  })

  it('dispatches on type and throws for unsupported types', () => {
    expect(buildPuzzle(word('kat')).type).toBe('word')
    expect(buildPuzzle(sum(2, '+', 3)).type).toBe('sum')
    expect(() => buildPuzzle({ ...base, id: 'l-a', type: 'letter', prompt: 'a', answer: 'a' })).toThrow()
  })
})
