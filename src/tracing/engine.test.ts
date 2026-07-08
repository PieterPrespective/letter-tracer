import { describe, expect, it } from 'vitest'
import { TraceEngine } from './engine'
import { resample } from '../geometry/polyline'
import type { Point } from '../geometry/point'
import type { Glyph } from '../model/types'

// A gentle horizontal line and a semicircle, both well inside the glyph box.
const LINE: Point[] = [
  { x: 100, y: 500 },
  { x: 900, y: 500 },
]

function semicircle(): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * (i / 24)
    pts.push({ x: 500 - Math.cos(a) * 300, y: 500 - Math.sin(a) * 300 })
  }
  return pts
}

const lineGlyph = (): Glyph => ({ char: '-', strokes: [{ points: LINE }] })

/** Ideal trace samples along a target path (fine spacing), with optional noise. */
function traceSamples(path: Point[], noise = 0): Point[] {
  const s = resample(path, 6)
  if (!noise) return s
  // Deterministic in-tolerance wobble (no Math.random → stable tests).
  return s.map((p, i) => ({ x: p.x + Math.sin(i) * noise, y: p.y + Math.cos(i) * noise }))
}

function runStroke(engine: TraceEngine, samples: Point[]): boolean {
  const began = engine.beginStroke(samples[0])
  for (let i = 1; i < samples.length; i++) engine.addPoint(samples[i])
  engine.endStroke()
  return began
}

describe('TraceEngine — happy path', () => {
  it('completes a stroke traced along the path', () => {
    const engine = new TraceEngine(lineGlyph())
    runStroke(engine, traceSamples(LINE))
    expect(engine.isComplete).toBe(true)
  })

  it('tolerates in-bounds noise', () => {
    const engine = new TraceEngine(lineGlyph())
    runStroke(engine, traceSamples(LINE, 40))
    expect(engine.isComplete).toBe(true)
  })
})

describe('TraceEngine — start gate & direction', () => {
  it('rejects starting at the wrong end of the stroke', () => {
    const engine = new TraceEngine(lineGlyph())
    const began = engine.beginStroke({ x: 900, y: 500 }) // the END point
    expect(began).toBe(false)
    expect(engine.status).toBe('off-path')
  })

  it('does not advance for backward (wrong-direction) movement', () => {
    const engine = new TraceEngine(lineGlyph())
    const forward = traceSamples(LINE)
    engine.beginStroke(forward[0])
    for (let i = 1; i < 30; i++) engine.addPoint(forward[i])
    const mid = engine.progress
    // Now move backward toward the start.
    for (let i = 28; i >= 0; i--) engine.addPoint(forward[i])
    expect(engine.progress).toBeCloseTo(mid) // held, not advanced
    expect(engine.isComplete).toBe(false)
  })
})

describe('TraceEngine — off-path forgiveness', () => {
  it('ignores an off-path excursion, then resumes when back on the road', () => {
    const engine = new TraceEngine(lineGlyph())
    const s = traceSamples(LINE)
    engine.beginStroke(s[0])
    for (let i = 1; i < 40; i++) engine.addPoint(s[i])
    const before = engine.progress
    engine.addPoint({ x: 500, y: 50 }) // way off the road
    expect(engine.status).toBe('off-path')
    expect(engine.progress).toBeCloseTo(before) // no advance while off
    for (let i = 40; i < s.length; i++) engine.addPoint(s[i])
    engine.endStroke()
    expect(engine.isComplete).toBe(true)
  })
})

describe('TraceEngine — anti corner-cut', () => {
  it('does not complete a curved stroke traced as a straight chord', () => {
    const arc = semicircle()
    const engine = new TraceEngine({ char: 'c', strokes: [{ points: arc }] })
    // A straight line from start to end skips the whole arc.
    const chord = resample([arc[0], arc[arc.length - 1]], 6)
    runStroke(engine, chord)
    expect(engine.isComplete).toBe(false)
  })
})

describe('TraceEngine — stroke order', () => {
  const twoStroke: Glyph = {
    char: 'T',
    strokes: [
      { points: [{ x: 200, y: 200 }, { x: 800, y: 200 }] }, // top bar
      { points: [{ x: 500, y: 200 }, { x: 500, y: 800 }] }, // stem
    ],
  }

  it('rejects the second stroke before the first is done, then completes in order', () => {
    const engine = new TraceEngine(twoStroke)
    // Try to begin the stem (stroke 1) first — its start is far from stroke 0's.
    expect(engine.beginStroke({ x: 500, y: 800 })).toBe(false)

    runStroke(engine, traceSamples(twoStroke.strokes[0].points))
    expect(engine.currentStroke).toBe(1)
    expect(engine.status).toBe('awaiting-start')
    expect(engine.isComplete).toBe(false)

    runStroke(engine, traceSamples(twoStroke.strokes[1].points))
    expect(engine.isComplete).toBe(true)
    expect(engine.completedTrails).toHaveLength(2)
  })
})

describe('TraceEngine — resume after lift', () => {
  it('keeps progress across a pen lift and finishes on resume', () => {
    const engine = new TraceEngine(lineGlyph())
    const s = traceSamples(LINE)
    const half = Math.floor(s.length / 2)
    engine.beginStroke(s[0])
    for (let i = 1; i < half; i++) engine.addPoint(s[i])
    engine.endStroke() // lift mid-stroke
    expect(engine.isComplete).toBe(false)
    const kept = engine.progress
    expect(kept).toBeGreaterThan(0.3)

    // Resume near where we left off.
    engine.beginStroke(s[half - 1])
    for (let i = half; i < s.length; i++) engine.addPoint(s[i])
    engine.endStroke()
    expect(engine.isComplete).toBe(true)
  })
})

describe('TraceEngine — deviation tracking (for scoring)', () => {
  it('reports ~0 mean deviation for a dead-on trace and more for a noisy one', () => {
    const clean = new TraceEngine(lineGlyph())
    runStroke(clean, traceSamples(LINE))
    expect(clean.meanDeviation).toBeLessThan(1)

    const noisy = new TraceEngine(lineGlyph())
    runStroke(noisy, traceSamples(LINE, 40))
    expect(noisy.meanDeviation).toBeGreaterThan(clean.meanDeviation)
    expect(noisy.isComplete).toBe(true)
  })
})

describe('TraceEngine — reset', () => {
  it('returns to the initial state', () => {
    const engine = new TraceEngine(lineGlyph())
    runStroke(engine, traceSamples(LINE))
    engine.reset()
    expect(engine.isComplete).toBe(false)
    expect(engine.currentStroke).toBe(0)
    expect(engine.progress).toBe(0)
    expect(engine.completedTrails).toHaveLength(0)
  })
})
