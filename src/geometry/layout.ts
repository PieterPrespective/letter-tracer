// Lays out a row of glyphs (a word or a sum) left-to-right, each in its own
// 0..GLYPH_SIZE box, and returns one glyph→canvas Transform per glyph. The row
// is scaled to fit the canvas (by width or height, whichever binds) and centred.
// A single glyph reduces to the same fit as fitGlyphBox. See
// Prompts/lt-01/02-data-model.md (multi-glyph layout).

import { GLYPH_SIZE } from '../config'
import type { Transform } from './box'

/** Horizontal step between adjacent glyph origins, in glyph units. */
export const GLYPH_ADVANCE = 640

export function layoutGlyphs(count: number, canvasW: number, canvasH: number, padding = 0.08): Transform[] {
  const n = Math.max(1, count)
  const rowWidth = (n - 1) * GLYPH_ADVANCE + GLYPH_SIZE
  const pad = padding * Math.min(canvasW, canvasH)
  const scale = Math.min((canvasW - 2 * pad) / rowWidth, (canvasH - 2 * pad) / GLYPH_SIZE)
  const offsetX = (canvasW - rowWidth * scale) / 2
  const offsetY = (canvasH - GLYPH_SIZE * scale) / 2
  const out: Transform[] = []
  for (let i = 0; i < n; i++) out.push({ scale, offsetX: offsetX + i * GLYPH_ADVANCE * scale, offsetY })
  return out
}
