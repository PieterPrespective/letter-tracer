// Draws the target glyph: the forgiving "road" (tolerance band), a faint
// centre-line guide, the start dot for the current stroke, and the child's
// accepted ink. Kept simple for M0; celebration/particles come in M2.

import { GLYPH_SIZE, config } from '../config'
import { type Transform, glyphToCanvas } from '../geometry/box'
import type { Point } from '../geometry/point'
import type { CanvasSurface } from './canvas'
import type { TraceEngine } from '../tracing/engine'

const COLORS = {
  bg: '#fdf6e3',
  road: '#e7dcc4',
  guide: '#c9bda0',
  current: '#6c9bd1',
  ink: '#2f6b3f',
  inkCurrent: '#3f8f52',
  start: '#e2683c',
}

function strokeTolerancePx(strokeToleranceFraction: number | undefined, t: Transform): number {
  const frac = strokeToleranceFraction ?? config.toleranceFraction
  return frac * GLYPH_SIZE * t.scale
}

function pathTo(ctx: CanvasRenderingContext2D, pts: Point[], t: Transform): void {
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const c = glyphToCanvas(pts[i], t)
    if (i === 0) ctx.moveTo(c.x, c.y)
    else ctx.lineTo(c.x, c.y)
  }
}

export function drawScene(surface: CanvasSurface, engine: TraceEngine): void {
  const { ctx, transform: t } = surface
  ctx.clearRect(0, 0, surface.cssWidth, surface.cssHeight)
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, surface.cssWidth, surface.cssHeight)

  const strokes = engine.glyph.strokes

  // 1. The road: every stroke as a wide, soft band.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes) {
    ctx.strokeStyle = COLORS.road
    ctx.lineWidth = 2 * strokeTolerancePx(s.tolerance, t)
    pathTo(ctx, s.points, t)
    ctx.stroke()
  }

  // 2. Centre-line guide; the current stroke stands out.
  for (let i = 0; i < strokes.length; i++) {
    ctx.strokeStyle = i === engine.currentStroke ? COLORS.current : COLORS.guide
    ctx.lineWidth = i === engine.currentStroke ? 4 : 2
    ctx.setLineDash(i === engine.currentStroke ? [] : [8, 10])
    pathTo(ctx, strokes[i].points, t)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // 3. The child's accepted ink (completed strokes + current trail).
  ctx.strokeStyle = COLORS.ink
  ctx.lineWidth = 10
  for (const trail of engine.completedTrails) {
    if (trail.length < 2) continue
    pathTo(ctx, trail, t)
    ctx.stroke()
  }
  if (engine.acceptedTrail.length >= 2) {
    ctx.strokeStyle = COLORS.inkCurrent
    pathTo(ctx, engine.acceptedTrail, t)
    ctx.stroke()
  }

  // 4. Start dot for the current stroke (guidance).
  if (!engine.isComplete) {
    const start = glyphToCanvas(engine.startPoint(), t)
    ctx.fillStyle = COLORS.start
    ctx.beginPath()
    ctx.arc(start.x, start.y, 14, 0, 2 * Math.PI)
    ctx.fill()
  }
}
