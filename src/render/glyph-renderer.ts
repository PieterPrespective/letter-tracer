// Draws the target glyph: the forgiving "road" (tolerance band), a faint
// centre-line guide, the start dot for the current stroke, and the child's
// accepted ink. Kept simple for M0; celebration/particles come in M2.

import { GLYPH_SIZE, config } from '../config'
import { type Transform, glyphToCanvas } from '../geometry/box'
import { layoutGlyphs } from '../geometry/layout'
import { canvasColors } from '../theme'
import type { Point } from '../geometry/point'
import type { Glyph } from '../model/types'
import type { CanvasSurface } from './canvas'
import type { TraceEngine } from '../tracing/engine'

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

/** Draw one or more glyphs' centre-lines into a (w×h CSS-px) context — for tiles. */
export function drawGlyphsPreview(
  ctx: CanvasRenderingContext2D,
  glyphs: Glyph[],
  w: number,
  h: number,
  color?: string,
): void {
  const layout = layoutGlyphs(glyphs.length, w, h, 0.14)
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = color ?? canvasColors().ink
  ctx.lineWidth = Math.max(2, 44 * layout[0].scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  glyphs.forEach((g, i) => {
    for (const s of g.strokes) {
      pathTo(ctx, s.points, layout[i])
      ctx.stroke()
    }
  })
}

export interface DrawOptions {
  /** Draw the authoring overlay: stroke numbers, start dots, direction arrows. */
  debug?: boolean
}

type GlyphMode = 'done' | 'active' | 'upcoming'

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: Glyph,
  t: Transform,
  mode: GlyphMode,
  engine: TraceEngine | null,
  debug: boolean,
): void {
  const strokes = glyph.strokes
  const c = canvasColors()

  // Road band under the letter (not for already-completed glyphs).
  if (mode !== 'done') {
    for (const s of strokes) {
      ctx.strokeStyle = c.road
      ctx.lineWidth = 2 * strokeTolerancePx(s.tolerance, t)
      pathTo(ctx, s.points, t)
      ctx.stroke()
    }
  }

  // Centre-line: solid ink for done glyphs, current stroke highlighted for the
  // active glyph, faint dashed guide for everything else.
  for (let i = 0; i < strokes.length; i++) {
    if (mode === 'done') {
      ctx.strokeStyle = c.ink
      ctx.lineWidth = 10
      ctx.setLineDash([])
    } else if (mode === 'active' && engine && i === engine.currentStroke) {
      ctx.strokeStyle = c.current
      ctx.lineWidth = 4
      ctx.setLineDash([])
    } else {
      ctx.strokeStyle = c.guide
      ctx.lineWidth = 2
      ctx.setLineDash([8, 10])
    }
    pathTo(ctx, strokes[i].points, t)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // The child's ink on the active glyph + the start dot for the current stroke.
  if (mode === 'active' && engine) {
    ctx.strokeStyle = c.ink
    ctx.lineWidth = 10
    for (const trail of engine.completedTrails) {
      if (trail.length < 2) continue
      pathTo(ctx, trail, t)
      ctx.stroke()
    }
    if (engine.acceptedTrail.length >= 2) {
      ctx.strokeStyle = c.inkActive
      pathTo(ctx, engine.acceptedTrail, t)
      ctx.stroke()
    }
    if (!engine.isComplete) {
      const start = glyphToCanvas(engine.startPoint(), t)
      ctx.fillStyle = c.start
      ctx.beginPath()
      ctx.arc(start.x, start.y, 14, 0, 2 * Math.PI)
      ctx.fill()
    }
  }

  if (debug) drawAuthoringOverlay(ctx, strokes, t)
}

/**
 * Render a whole exercise (one glyph, or a word/sum) with the active glyph
 * traced by `engine`, earlier glyphs shown as completed ink, and later glyphs
 * faint. `layout[i]` is the glyph→canvas transform for glyph i.
 */
export function drawWordScene(
  surface: CanvasSurface,
  layout: Transform[],
  glyphs: Glyph[],
  currentIndex: number,
  engine: TraceEngine,
  opts: DrawOptions = {},
): void {
  const { ctx } = surface
  ctx.clearRect(0, 0, surface.cssWidth, surface.cssHeight)
  ctx.fillStyle = canvasColors().bg
  ctx.fillRect(0, 0, surface.cssWidth, surface.cssHeight)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  glyphs.forEach((glyph, i) => {
    const mode: GlyphMode = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming'
    drawGlyph(ctx, glyph, layout[i], mode, mode === 'active' ? engine : null, opts.debug ?? false)
  })
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
