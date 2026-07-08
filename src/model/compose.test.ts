import { describe, expect, it } from 'vitest'
import { composeSum, composeWord } from './compose'

describe('composeWord', () => {
  it('composes a word into one glyph per letter', () => {
    const r = composeWord('kat')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.item.glyphs.map((g) => g.char).join('')).toBe('kat')
      expect(r.item.type).toBe('word')
      expect(r.item.source).toBe('user')
      expect(r.item.id).toBe('word-kat')
    }
  })

  it('rejects empty input and non-letters', () => {
    expect(composeWord('  ').ok).toBe(false)
    expect(composeWord('ka9').ok).toBe(false)
    expect(composeWord('hé!').ok).toBe(false)
  })
})

describe('composeSum', () => {
  it('composes a + b = result with correct glyphs and descriptor', () => {
    const r = composeSum(2, '+', 3)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.item.glyphs.map((g) => g.char).join('')).toBe('2+3=5')
      expect(r.item.sum).toEqual({ a: 2, op: '+', b: 3, result: 5 })
      expect(r.item.prompt).toBe('2 + 3 =')
    }
  })

  it('handles subtraction and multi-digit results', () => {
    const sub = composeSum(5, '-', 2)
    expect(sub.ok && sub.item.answer).toBe('3')
    const big = composeSum(6, '+', 7) // 13 -> two digit glyphs
    expect(big.ok).toBe(true)
    if (big.ok) expect(big.item.glyphs.map((g) => g.char).join('')).toBe('6+7=13')
  })

  it('rejects negative results and bad operands', () => {
    expect(composeSum(2, '-', 5).ok).toBe(false)
    expect(composeSum(-1, '+', 2).ok).toBe(false)
  })
})
