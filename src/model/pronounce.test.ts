import { describe, expect, it } from 'vitest'
import { pronounceText } from './pronounce'
import type { ContentItem } from './types'

const base = { glyphs: [], source: 'base' as const }
const letter = (c: string): ContentItem => ({ ...base, id: `l-${c}`, type: 'letter', prompt: c, answer: c })
const number = (c: string): ContentItem => ({ ...base, id: `n-${c}`, type: 'number', prompt: c, answer: c })

describe('pronounceText', () => {
  it('reads a letter as its prompt (TTS says the name)', () => {
    expect(pronounceText(letter('a'))).toBe('a')
  })

  it('reads a digit as a Dutch number word', () => {
    expect(pronounceText(number('2'))).toBe('twee')
    expect(pronounceText(number('9'))).toBe('negen')
  })

  it('reads a word as-is', () => {
    expect(pronounceText({ ...base, id: 'w', type: 'word', prompt: 'kat', answer: 'kat' })).toBe('kat')
  })

  it('reads a sum in words', () => {
    const sum: ContentItem = {
      ...base,
      id: 's',
      type: 'sum',
      prompt: '2 + 3 =',
      answer: '5',
      sum: { a: 2, op: '+', b: 3, result: 5 },
    }
    expect(pronounceText(sum)).toBe('twee plus drie is vijf')
  })

  it('says "ij" for the letter y, not the formal "ypsilon"', () => {
    expect(pronounceText(letter('y'))).toBe('ij')
    expect(pronounceText(letter('Y'))).toBe('ij')
  })

  it('honours an explicit say override', () => {
    expect(pronounceText({ ...letter('a'), say: 'aap' })).toBe('aap')
  })
})
