import { describe, expect, it } from 'vitest'
import { canvasToGlyph, clientToGlyph, fitGlyphBox, glyphToCanvas } from './box'
import type { Point } from './point'

describe('fitGlyphBox', () => {
  it('centres the glyph box in the canvas', () => {
    const t = fitGlyphBox(800, 600)
    // The glyph centre (500,500) should map to the canvas centre.
    expect(glyphToCanvas({ x: 500, y: 500 }, t)).toEqual({ x: 400, y: 300 })
  })

  it('uses a single uniform scale (aspect ratio preserved)', () => {
    const t = fitGlyphBox(1200, 400)
    // A unit square in glyph space stays square in canvas space.
    const a = glyphToCanvas({ x: 0, y: 0 }, t)
    const b = glyphToCanvas({ x: 100, y: 0 }, t)
    const c = glyphToCanvas({ x: 0, y: 100 }, t)
    expect(b.x - a.x).toBeCloseTo(c.y - a.y)
  })
})

describe('glyph <-> canvas round trip', () => {
  it('is the identity within floating-point epsilon', () => {
    const t = fitGlyphBox(1024, 768)
    const samples: Point[] = [
      { x: 0, y: 0 },
      { x: 1000, y: 1000 },
      { x: 250, y: 750 },
      { x: 512.5, y: 333.3 },
    ]
    for (const p of samples) {
      const back = canvasToGlyph(glyphToCanvas(p, t), t)
      expect(back.x).toBeCloseTo(p.x)
      expect(back.y).toBeCloseTo(p.y)
    }
  })
})

describe('clientToGlyph', () => {
  it('subtracts the canvas rect origin before mapping to glyph space', () => {
    const t = fitGlyphBox(800, 600)
    const rect = { left: 30, top: 20 }
    // A client point over the glyph centre (canvas 400,300 + rect origin).
    const g = clientToGlyph(400 + 30, 300 + 20, rect, t)
    expect(g.x).toBeCloseTo(500)
    expect(g.y).toBeCloseTo(500)
  })
})
