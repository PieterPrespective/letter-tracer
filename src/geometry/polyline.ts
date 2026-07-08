// Polyline geometry: the math the tracing engine runs on every input sample.
// Pure and allocation-light; unit-tested in polyline.test.ts.

import { type Point, dist, lerp, clamp } from './point'

/** Projection of p onto segment a→b, clamped to the segment. */
export function closestOnSegment(p: Point, a: Point, b: Point): { point: Point; t: number } {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const denom = abx * abx + aby * aby
  const t = denom === 0 ? 0 : clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / denom, 0, 1)
  return { point: { x: a.x + abx * t, y: a.y + aby * t }, t }
}

/** Shortest distance from a point to a segment. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  return dist(p, closestOnSegment(p, a, b).point)
}

/** Cumulative arc length at each vertex; result[0] === 0. */
export function cumulativeLengths(pts: Point[]): number[] {
  const out = new Array<number>(pts.length)
  out[0] = 0
  for (let i = 1; i < pts.length; i++) out[i] = out[i - 1] + dist(pts[i - 1], pts[i])
  return out
}

/** Total length of the polyline. */
export function polylineLength(pts: Point[]): number {
  if (pts.length < 2) return 0
  let total = 0
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i])
  return total
}

/**
 * Resample a polyline to roughly uniform arc-length spacing, preserving the
 * first and last vertices. Makes tolerance and progress behave evenly.
 */
export function resample(pts: Point[], spacing: number): Point[] {
  if (pts.length <= 1) return pts.slice()
  const cum = cumulativeLengths(pts)
  const total = cum[cum.length - 1]
  const last = pts[pts.length - 1]
  if (total === 0) return [pts[0]]

  const out: Point[] = [pts[0]]
  let seg = 1
  for (let d = spacing; d < total; d += spacing) {
    while (seg < pts.length - 1 && cum[seg] < d) seg++
    const segLen = cum[seg] - cum[seg - 1]
    const t = segLen === 0 ? 0 : (d - cum[seg - 1]) / segLen
    out.push(lerp(pts[seg - 1], pts[seg], t))
  }
  // Ensure the true endpoint is present and not a near-duplicate of the tail.
  if (dist(out[out.length - 1], last) > 1e-6) out.push(last)
  return out
}

export interface PolylineHit {
  /** Distance from the query point to its projection on the polyline. */
  dist: number
  /** Index of the segment (vertex i → i+1) the projection lies on. */
  segIndex: number
  /** Parameter along that segment, 0..1. */
  t: number
  /** The projected point on the polyline. */
  point: Point
  /** Arc length from the polyline start to the projection. */
  arcLen: number
}

/**
 * Nearest point on a polyline to p. Pass `cum` (from cumulativeLengths) to avoid
 * recomputing it. An optional arc-length `window` restricts the search to
 * segments near a hint — essential for self-intersecting glyphs (loops), where
 * the globally-nearest branch may be the wrong one.
 */
export function closestOnPolyline(
  p: Point,
  pts: Point[],
  cum?: number[],
  window?: { center: number; radius: number },
): PolylineHit {
  const cuml = cum ?? cumulativeLengths(pts)
  let best: PolylineHit | null = null

  const consider = (i: number) => {
    const { point, t } = closestOnSegment(p, pts[i], pts[i + 1])
    const d = dist(p, point)
    if (best === null || d < best.dist) {
      const arcLen = cuml[i] + t * (cuml[i + 1] - cuml[i])
      best = { dist: d, segIndex: i, t, point, arcLen }
    }
  }

  const lo = window ? window.center - window.radius : -Infinity
  const hi = window ? window.center + window.radius : Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    // Segment arc range [cum[i], cum[i+1]] must intersect the window.
    if (cuml[i + 1] < lo || cuml[i] > hi) continue
    consider(i)
  }
  // If the window excluded everything, fall back to a global search.
  if (best === null) for (let i = 0; i < pts.length - 1; i++) consider(i)
  return best!
}

/** The point at a given arc length along a polyline (clamped to its ends). */
export function pointAtArcLen(pts: Point[], cum: number[], arc: number): Point {
  const total = cum[cum.length - 1]
  if (arc <= 0) return pts[0]
  if (arc >= total) return pts[pts.length - 1]
  let i = 1
  while (i < cum.length && cum[i] < arc) i++
  const segLen = cum[i] - cum[i - 1]
  const t = segLen === 0 ? 0 : (arc - cum[i - 1]) / segLen
  return lerp(pts[i - 1], pts[i], t)
}
