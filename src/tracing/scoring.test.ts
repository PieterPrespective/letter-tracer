import { describe, expect, it } from 'vitest'
import { scoreGlyph } from './scoring'

describe('scoreGlyph', () => {
  const TOL = 100

  it('gives three stars for a near-perfect trace', () => {
    expect(scoreGlyph(0, TOL)).toEqual({ accuracy: 1, stars: 3 })
    expect(scoreGlyph(10, TOL).stars).toBe(3)
  })

  it('gives two stars for a decent trace', () => {
    expect(scoreGlyph(50, TOL).stars).toBe(2) // accuracy 0.5
  })

  it('never gives zero stars for a completed glyph', () => {
    expect(scoreGlyph(TOL, TOL)).toEqual({ accuracy: 0, stars: 1 })
    expect(scoreGlyph(TOL * 5, TOL).stars).toBe(1) // clamped
  })

  it('is monotonic in deviation', () => {
    expect(scoreGlyph(10, TOL).accuracy).toBeGreaterThan(scoreGlyph(60, TOL).accuracy)
  })

  it('handles a zero tolerance without dividing by zero', () => {
    expect(scoreGlyph(5, 0)).toEqual({ accuracy: 1, stars: 3 })
  })
})
