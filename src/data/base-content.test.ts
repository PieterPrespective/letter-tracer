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
    // a–z, A–Z, 0–9, + - =  = 26 + 26 + 10 + 3
    expect(baseContent.items).toHaveLength(65)
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
