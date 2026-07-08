import { describe, expect, it } from 'vitest'
import {
  closestOnPolyline,
  closestOnSegment,
  cumulativeLengths,
  distToSegment,
  pointAtArcLen,
  polylineLength,
  resample,
} from './polyline'
import type { Point } from './point'

describe('distToSegment / closestOnSegment', () => {
  const a: Point = { x: 0, y: 0 }
  const b: Point = { x: 10, y: 0 }

  it('measures perpendicular distance to the segment interior', () => {
    expect(distToSegment({ x: 5, y: 3 }, a, b)).toBeCloseTo(3)
  })

  it('clamps to the nearest endpoint when the projection is outside', () => {
    expect(distToSegment({ x: -4, y: 0 }, a, b)).toBeCloseTo(4)
    expect(closestOnSegment({ x: -4, y: 0 }, a, b).t).toBe(0)
    expect(closestOnSegment({ x: 99, y: 0 }, a, b).t).toBe(1)
  })

  it('handles a degenerate (zero-length) segment', () => {
    expect(distToSegment({ x: 3, y: 4 }, a, a)).toBeCloseTo(5)
  })
})

describe('cumulativeLengths / polylineLength', () => {
  const pts: Point[] = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 4 },
  ]

  it('is monotonic and ends at the total length', () => {
    const cum = cumulativeLengths(pts)
    expect(cum[0]).toBe(0)
    expect(cum[1]).toBeCloseTo(3)
    expect(cum[2]).toBeCloseTo(7)
    expect(cum[cum.length - 1]).toBeCloseTo(polylineLength(pts))
  })
})

describe('resample', () => {
  const line: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]

  it('preserves endpoints and total length', () => {
    const r = resample(line, 10)
    expect(r[0]).toEqual({ x: 0, y: 0 })
    expect(r[r.length - 1]).toEqual({ x: 100, y: 0 })
    expect(polylineLength(r)).toBeCloseTo(100)
  })

  it('produces roughly uniform spacing', () => {
    const r = resample(line, 10)
    for (let i = 1; i < r.length - 1; i++) {
      expect(r[i].x - r[i - 1].x).toBeCloseTo(10)
    }
  })

  it('returns the sole point for a single-point or zero-length input', () => {
    expect(resample([{ x: 5, y: 5 }], 10)).toEqual([{ x: 5, y: 5 }])
    expect(resample([{ x: 5, y: 5 }, { x: 5, y: 5 }], 10)).toEqual([{ x: 5, y: 5 }])
  })
})

describe('closestOnPolyline', () => {
  const line: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]

  it('reports distance, segment index and arc length', () => {
    const hit = closestOnPolyline({ x: 40, y: 5 }, line)
    expect(hit.dist).toBeCloseTo(5)
    expect(hit.segIndex).toBe(0)
    expect(hit.arcLen).toBeCloseTo(40)
  })

  it('uses the arc-length window to pick the right branch of a crossing path', () => {
    // Bowtie: (50,50) lies on both segment 0 (arc ~70.7) and segment 2 (arc ~312).
    const cross: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ]
    const q: Point = { x: 50, y: 50 }
    const early = closestOnPolyline(q, cross, undefined, { center: 70, radius: 50 })
    const late = closestOnPolyline(q, cross, undefined, { center: 312, radius: 50 })
    expect(early.arcLen).toBeLessThan(150)
    expect(late.arcLen).toBeGreaterThan(250)
  })
})

describe('pointAtArcLen', () => {
  const line: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]
  const cum = cumulativeLengths(line)

  it('interpolates along the path and clamps to the ends', () => {
    expect(pointAtArcLen(line, cum, 25)).toEqual({ x: 25, y: 0 })
    expect(pointAtArcLen(line, cum, -5)).toEqual({ x: 0, y: 0 })
    expect(pointAtArcLen(line, cum, 999)).toEqual({ x: 100, y: 0 })
  })
})
