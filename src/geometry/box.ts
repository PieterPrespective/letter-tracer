// Maps between glyph space (0..GLYPH_SIZE square, y-down) and canvas/CSS pixel
// space, preserving aspect ratio and centring the glyph with padding. All
// tracing math happens in glyph space; only rendering and raw input touch
// canvas space. Pure and unit-tested in box.test.ts.

import { type Point } from './point'
import { GLYPH_SIZE } from '../config'

/** A uniform-scale + translate transform (glyph → canvas). */
export interface Transform {
  scale: number
  offsetX: number
  offsetY: number
}

export interface FitOptions {
  /** Size of the (square) glyph box. Defaults to GLYPH_SIZE. */
  glyphSize?: number
  /** Padding on each side as a fraction of the smaller canvas dimension. */
  padding?: number
}

/** Fit the square glyph box into a canvas rectangle, centred with padding. */
export function fitGlyphBox(canvasW: number, canvasH: number, opts: FitOptions = {}): Transform {
  const glyphSize = opts.glyphSize ?? GLYPH_SIZE
  const padding = opts.padding ?? 0.08
  const pad = padding * Math.min(canvasW, canvasH)
  const avail = Math.min(canvasW - 2 * pad, canvasH - 2 * pad)
  const scale = avail / glyphSize
  const drawn = glyphSize * scale
  return {
    scale,
    offsetX: (canvasW - drawn) / 2,
    offsetY: (canvasH - drawn) / 2,
  }
}

/** Glyph-space point → canvas-space point. */
export function glyphToCanvas(p: Point, t: Transform): Point {
  return { x: p.x * t.scale + t.offsetX, y: p.y * t.scale + t.offsetY }
}

/** Canvas-space point → glyph-space point. */
export function canvasToGlyph(p: Point, t: Transform): Point {
  return { x: (p.x - t.offsetX) / t.scale, y: (p.y - t.offsetY) / t.scale }
}

/** Pointer client (viewport) coords → glyph space, given the canvas rect. */
export function clientToGlyph(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  t: Transform,
): Point {
  return canvasToGlyph({ x: clientX - rect.left, y: clientY - rect.top }, t)
}
