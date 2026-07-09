import { describe, expect, it } from 'vitest'
import { GLYPH_ADVANCE, chooseTraceMode, layoutGlyphs } from './layout'
import { fitGlyphBox, glyphToCanvas } from './box'
import { CM_TO_CSS_PX, GLYPH_SIZE, MIN_GLYPH_CM } from '../config'

describe('layoutGlyphs', () => {
  it('matches fitGlyphBox for a single glyph', () => {
    const [a] = layoutGlyphs(1, 800, 600)
    const b = fitGlyphBox(800, 600)
    expect(a.scale).toBeCloseTo(b.scale)
    expect(a.offsetX).toBeCloseTo(b.offsetX)
    expect(a.offsetY).toBeCloseTo(b.offsetY)
  })

  it('shares one scale and steps origins by the advance', () => {
    const cells = layoutGlyphs(3, 1200, 400)
    expect(cells).toHaveLength(3)
    for (const c of cells) expect(c.scale).toBeCloseTo(cells[0].scale)
    const step = cells[1].offsetX - cells[0].offsetX
    expect(step).toBeCloseTo(GLYPH_ADVANCE * cells[0].scale)
    expect(cells[2].offsetX - cells[1].offsetX).toBeCloseTo(step)
  })

  it('keeps the whole row within the canvas', () => {
    const cells = layoutGlyphs(4, 1000, 500)
    const first = glyphToCanvas({ x: 0, y: 0 }, cells[0])
    const last = glyphToCanvas({ x: 1000, y: 1000 }, cells[3])
    expect(first.x).toBeGreaterThanOrEqual(0)
    expect(last.x).toBeLessThanOrEqual(1000)
    expect(last.y).toBeLessThanOrEqual(500)
  })
})

describe('chooseTraceMode', () => {
  const threshold = MIN_GLYPH_CM * CM_TO_CSS_PX // ~113px

  const rowGlyphPx = (count: number, w: number, h: number) => GLYPH_SIZE * layoutGlyphs(count, w, h)[0].scale

  it('always uses row for a single glyph', () => {
    expect(chooseTraceMode(10, false, 1)).toBe('row')
    expect(chooseTraceMode(10, true, 1)).toBe('row')
  })

  it('forces focused when "grote letters" is on', () => {
    expect(chooseTraceMode(9999, true, 3)).toBe('focused')
  })

  it('switches to focused below the ~3cm glyph height', () => {
    expect(chooseTraceMode(threshold - 1, false, 5)).toBe('focused')
    expect(chooseTraceMode(threshold + 1, false, 5)).toBe('row')
  })

  it('a 5-glyph sum on a phone (portrait) is focused; on a tablet it is row', () => {
    expect(chooseTraceMode(rowGlyphPx(5, 360, 640), false, 5)).toBe('focused')
    expect(chooseTraceMode(rowGlyphPx(5, 1200, 800), false, 5)).toBe('row')
  })
})
