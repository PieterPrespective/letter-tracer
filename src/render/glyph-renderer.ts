// Draws the target glyph: the forgiving "road" (tolerance band), a faint
// centre-line guide, the start dot for the current stroke, and the child's
// accepted ink. Kept simple for M0; celebration/particles come in M2.

import { GLYPH_SIZE, config } from '../config'
import { type Transform, fitGlyphBox, glyphToCanvas } from '../geometry/box'
import type { Point } from '../geometry/point'
import type { Glyph } from '../model/types'
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

/** Draw a glyph's centre-lines into a (w×h CSS-px) context — for picker tiles. */
export function drawGlyphPreview(
  ctx: CanvasRenderingContext2D,
  glyph: Glyph,
  w: number,
  h: number,
  color = COLORS.ink,
): void {
  const t = fitGlyphBox(w, h, { padding: 0.14 })
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(3, 46 * t.scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of glyph.strokes) {
    pathTo(ctx, s.points, t)
    ctx.stroke()
  }
}

export interface DrawOptions {
  /** Draw the authoring overlay: stroke numbers, start dots, direction arrows. */
  debug?: boolean
}

export function drawScene(surface: CanvasSurface, engine: TraceEngine, opts: DrawOptions = {}): void {
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

  if (opts.debug) drawAuthoringOverlay(ctx, strokes, t)
}

/** Reviewer overlay: per-stroke start dot, order number, and a direction arrow. */
function drawAuthoringOverlay(
  ctx: CanvasRenderingContext2D,
  strokes: { points: Point[] }[],
  t: Transform,
): void {
  ctx.font = 'bold 22px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < strokes.length; i++) {
    const pts = strokes[i].points
    const start = glyphToCanvas(pts[0], t)
    const end = glyphToCanvas(pts[pts.length - 1], t)
    const prev = glyphToCanvas(pts[Math.max(0, pts.length - 2)], t)

    // Start dot + order number.
    ctx.fillStyle = '#1f8a4c'
    ctx.beginPath()
    ctx.arc(start.x, start.y, 13, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(String(i + 1), start.x, start.y + 1)

    // Direction arrowhead at the stroke end.
    const ang = Math.atan2(end.y - prev.y, end.x - prev.x)
    const h = 16
    ctx.fillStyle = '#d12f5a'
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(end.x - h * Math.cos(ang - 0.4), end.y - h * Math.sin(ang - 0.4))
    ctx.lineTo(end.x - h * Math.cos(ang + 0.4), end.y - h * Math.sin(ang + 0.4))
    ctx.closePath()
    ctx.fill()
  }
}
