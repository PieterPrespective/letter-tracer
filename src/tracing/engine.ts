// The tracing state machine. Pure and DOM-free: it consumes glyph-space points
// and exposes state the renderer reads. All forgiveness/validation lives here.
// See Prompts/lt-01/05-tracing-and-scoring.md. Unit-tested in engine.test.ts.

import { type Point, dist } from '../geometry/point'
import {
  type PolylineHit,
  closestOnPolyline,
  cumulativeLengths,
  pointAtArcLen,
  resample,
} from '../geometry/polyline'
import { GLYPH_SIZE, type TraceConfig, config as defaultConfig } from '../config'
import type { Glyph } from '../model/types'

export type TraceStatus =
  | 'awaiting-start'
  | 'tracing'
  | 'stroke-complete'
  | 'glyph-complete'
  | 'off-path'

interface PreparedStroke {
  pts: Point[]
  cum: number[]
  length: number
  tolerance: number
  startTolerance: number
  endTolerance: number
}

function prepare(glyph: Glyph, cfg: TraceConfig): PreparedStroke[] {
  return glyph.strokes.map((s) => {
    const pts = resample(s.points, cfg.resampleSpacing)
    const cum = cumulativeLengths(pts)
    const frac = s.tolerance ?? cfg.toleranceFraction
    return {
      pts,
      cum,
      length: cum[cum.length - 1],
      tolerance: frac * GLYPH_SIZE,
      startTolerance: cfg.startToleranceFraction * GLYPH_SIZE,
      endTolerance: cfg.endToleranceFraction * GLYPH_SIZE,
    }
  })
}

export class TraceEngine {
  readonly glyph: Glyph
  private readonly cfg: TraceConfig
  private readonly strokes: PreparedStroke[]

  currentStroke = 0
  /** Normalised progress along the current stroke, 0..1. */
  progress = 0
  status: TraceStatus = 'awaiting-start'
  /** Accepted points on the current stroke, in glyph space (for rendering). */
  acceptedTrail: Point[] = []
  /** Accepted trails of completed strokes. */
  completedTrails: Point[][] = []

  private active = false
  private glyphDevSum = 0
  private glyphDevCount = 0
  private strokeDevSum = 0
  private strokeDevCount = 0

  constructor(glyph: Glyph, cfg: TraceConfig = defaultConfig) {
    this.glyph = glyph
    this.cfg = cfg
    this.strokes = prepare(glyph, cfg)
  }

  get strokeCount(): number {
    return this.strokes.length
  }

  get isComplete(): boolean {
    return this.status === 'glyph-complete'
  }

  /** Mean distance-from-path of accepted samples across completed strokes. */
  get meanDeviation(): number {
    return this.glyphDevCount > 0 ? this.glyphDevSum / this.glyphDevCount : 0
  }

  /** Base tolerance (glyph units) of the current stroke, for scoring. */
  get tolerance(): number {
    return this.strokes[this.currentStroke]?.tolerance ?? this.strokes[0].tolerance
  }

  /** Start point the child must begin the current stroke near. */
  startPoint(): Point {
    return this.strokes[this.currentStroke].pts[0]
  }

  private target(): PreparedStroke {
    return this.strokes[this.currentStroke]
  }

  private progressPoint(t: PreparedStroke): Point {
    return pointAtArcLen(t.pts, t.cum, this.progress * t.length)
  }

  /** Pen-down. Returns whether tracing was accepted (correct start / resume). */
  beginStroke(p: Point): boolean {
    if (this.status === 'glyph-complete') return false
    const t = this.target()
    const nearStart = dist(p, t.pts[0]) <= t.startTolerance

    if (this.cfg.allowResumeAfterLift && this.progress > 0) {
      if (dist(p, this.progressPoint(t)) <= t.tolerance) {
        this.active = true
        this.status = 'tracing'
        return true
      }
    }
    if (nearStart) {
      this.progress = 0
      this.acceptedTrail = [t.pts[0]]
      this.strokeDevSum = 0
      this.strokeDevCount = 0
      this.active = true
      this.status = 'tracing'
      return true
    }
    // Wrong start (or wrong end / wrong direction): reject, nudge the child.
    this.status = 'off-path'
    return false
  }

  /** Pen-move sample. Advances progress only for on-path, forward input. */
  addPoint(p: Point): void {
    if (!this.active) return
    const t = this.target()
    const radius = Math.max(t.tolerance * 4, t.length * 0.25)
    const hit: PolylineHit = closestOnPolyline(p, t.pts, t.cum, {
      center: this.progress * t.length,
      radius,
    })
    const onPath = hit.dist <= t.tolerance
    const newProgress = t.length === 0 ? 1 : hit.arcLen / t.length

    if (!onPath) {
      this.status = 'off-path'
      return
    }
    if (newProgress < this.progress - this.cfg.backslack) {
      // Moving backward along the path: wrong direction — hold progress.
      this.status = 'off-path'
      return
    }
    // Anti corner-cut: reject a forward jump that skips a meaningful physical
    // distance. Measured in absolute arc length (capped below by tolerance) so
    // that very short strokes — dots on i/j — aren't blocked by a single step.
    const jumpArc = (newProgress - this.progress) * t.length
    const maxJumpArc = Math.max(t.tolerance, this.cfg.maxForwardJump * t.length)
    if (jumpArc > maxJumpArc) {
      this.status = 'off-path'
      return
    }

    this.progress = Math.max(this.progress, newProgress)
    this.acceptedTrail.push(hit.point)
    this.strokeDevSum += hit.dist
    this.strokeDevCount++
    this.status = 'tracing'

    const atEnd = dist(p, t.pts[t.pts.length - 1]) <= t.endTolerance
    if (this.progress >= this.cfg.completeThreshold && atEnd) {
      this.status = 'stroke-complete'
    }
  }

  /** Pen-up. Commits a completed stroke and advances, or keeps partial progress. */
  endStroke(): void {
    this.active = false
    if (this.status === 'stroke-complete') {
      this.completedTrails.push(this.acceptedTrail)
      this.glyphDevSum += this.strokeDevSum
      this.glyphDevCount += this.strokeDevCount
      this.strokeDevSum = 0
      this.strokeDevCount = 0
      this.acceptedTrail = []
      this.progress = 0
      this.currentStroke++
      this.status = this.currentStroke >= this.strokes.length ? 'glyph-complete' : 'awaiting-start'
    } else if (this.status !== 'glyph-complete') {
      // Incomplete stroke: keep progress so a lift-and-resume can continue.
      this.status = 'awaiting-start'
    }
  }

  /** Reset the whole glyph to its initial state. */
  reset(): void {
    this.currentStroke = 0
    this.progress = 0
    this.acceptedTrail = []
    this.completedTrails = []
    this.active = false
    this.glyphDevSum = 0
    this.glyphDevCount = 0
    this.strokeDevSum = 0
    this.strokeDevCount = 0
    this.status = 'awaiting-start'
  }
}
