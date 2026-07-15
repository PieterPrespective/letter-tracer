import { describe, expect, it } from 'vitest'
import { baseContent, baseWarnings } from '../model/glyph-library'
import { TraceEngine } from '../tracing/engine'
import { resample } from '../geometry/polyline'
import type { Glyph } from '../model/types'

/** Trace every stroke of a glyph along its ideal path. */
function traceIdeal(glyph: Glyph): TraceEngine {
  const engine = new TraceEngine(glyph)
  for (const stroke of glyph.strokes) {
    const samples = resample(stroke.points, 6)
    engine.beginStroke(samples[0])
    for (let i = 1; i < samples.length; i++) engine.addPoint(samples[i])
    engine.endStroke()
  }
  return engine
}

describe('base content pack', () => {
  it('parses with no warnings and has the full base set', () => {
    expect(baseWarnings).toEqual([])
    // 26 + 26 letters + 10 digits + 3 operators + 140 words + 7 sums
    expect(baseContent.items).toHaveLength(212)
  })

  it('includes traceable words and sums composed of base glyphs', () => {
    const kat = baseContent.items.find((i) => i.id === 'word-kat')
    expect(kat?.glyphs.map((g) => g.char).join('')).toBe('kat')
    expect(kat?.image).toEqual({ kind: 'emoji', value: '🐱' })
    const sum = baseContent.items.find((i) => i.id === 'sum-2p3')
    expect(sum?.glyphs.map((g) => g.char).join('')).toBe('2+3=5')
    expect(sum?.sum).toEqual({ a: 2, op: '+', b: 3, result: 5 })
  })

  it('every base glyph is traceable to completion along its ideal path', () => {
    const failed: string[] = []
    for (const item of baseContent.items) {
      for (const glyph of item.glyphs) {
        if (!traceIdeal(glyph).isComplete) failed.push(`${glyph.char} (${item.id})`)
      }
    }
    expect(failed, `untraceable glyphs: ${failed.join(', ')}`).toEqual([])
  })
})
