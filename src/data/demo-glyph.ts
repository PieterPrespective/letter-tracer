// M0 placeholder glyph. This lowercase 'a' is hand-generated just to exercise
// the engine and rendering end to end. Real, pedagogically-reviewed stroke data
// (Hershey-derived, correct Pennenstreken schrijfrichting/order) arrives in M1 —
// see Prompts/lt-01/03-stroke-data-and-pedagogy.md.

import { GLYPH_SIZE } from '../config'
import type { Glyph, Point } from '../model/types'

const CENTER: Point = { x: 0.42 * GLYPH_SIZE, y: 0.56 * GLYPH_SIZE }
const RADIUS = 0.24 * GLYPH_SIZE
const STEM_X = CENTER.x + RADIUS

/** Bowl: a full loop starting at the right-middle, closing the counter. */
function bowl(): Point[] {
  const pts: Point[] = []
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const a = -2 * Math.PI * (i / steps) // start at angle 0 (right), sweep up-left
    pts.push({ x: CENTER.x + Math.cos(a) * RADIUS, y: CENTER.y + Math.sin(a) * RADIUS })
  }
  return pts
}

/** Stem: the right-hand vertical, drawn top to bottom. */
function stem(): Point[] {
  return [
    { x: STEM_X, y: CENTER.y - RADIUS },
    { x: STEM_X, y: CENTER.y + RADIUS + 0.02 * GLYPH_SIZE },
  ]
}

export const demoGlyphA: Glyph = {
  char: 'a',
  strokes: [{ points: bowl(), hint: 'Begin rechts en ga rond' }, { points: stem(), hint: 'Van boven naar beneden' }],
  metrics: { baseline: 0.8 * GLYPH_SIZE, xHeight: 0.32 * GLYPH_SIZE, capHeight: 0.15 * GLYPH_SIZE },
}
