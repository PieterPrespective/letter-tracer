import { describe, expect, it } from 'vitest'
import { baseContent } from '../model/glyph-library'
import { TraceEngine } from '../tracing/engine'
import { resample } from '../geometry/polyline'
import type { Glyph } from '../model/types'

// Regression guard for real-world tracing. Unlike base-content.test (which
// traces the exact centre-line), this simulates a human: coarse-ish sampling,
// lateral wobble within tolerance, AND a couple of overshoot samples past each
// stroke's end. That overshoot is what exposed the "stroke-complete gets
// un-latched by a later move" bug that made closed-arc glyphs (b/d/g) and the
// i/j dots impossible to finish on a real device.
function traceHuman(glyph: Glyph, spacing: number, noise: number): boolean {
  const engine = new TraceEngine(glyph)
  for (const stroke of glyph.strokes) {
    const pts = resample(stroke.points, spacing)
    const noisy = pts.map((p, i) => ({ x: p.x + Math.sin(i * 1.7) * noise, y: p.y + Math.cos(i * 2.3) * noise }))
    const end = noisy[noisy.length - 1]
    noisy.push({ x: end.x + noise * 0.8, y: end.y + noise * 0.5 }, { x: end.x - noise * 0.6, y: end.y + noise })
    engine.beginStroke(noisy[0])
    for (let i = 1; i < noisy.length; i++) engine.addPoint(noisy[i])
    engine.endStroke()
  }
  return engine.isComplete
}

describe('human-like tracing completes every base glyph', () => {
  // Coalesced pointer events on the device produce dense samples (~spacing 20 in
  // glyph units); test that range with wobble up to ~60% of tolerance + overshoot.
  for (const spacing of [12, 20]) {
    for (const noise of [30, 50, 60]) {
      it(`spacing=${spacing}, noise=${noise}`, () => {
        const fails = baseContent.items
          .flatMap((item) => item.glyphs)
          .filter((g) => !traceHuman(g, spacing, noise))
          .map((g) => g.char)
        expect(fails, `did not complete: ${fails.join(' ')}`).toEqual([])
      })
    }
  }
})
