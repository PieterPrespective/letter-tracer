// Data model for traceable content. Stroke geometry is stored in glyph space
// (0..GLYPH_SIZE, y-down). See Prompts/lt-01/02-data-model.md.

import { type Point } from '../geometry/point'

export type { Point }

/** One pen-down..pen-up stroke: an ordered polyline the child must trace. */
export interface Stroke {
  /** Ordered path points; direction (start → end) encodes schrijfrichting. */
  points: Point[]
  /** Optional per-stroke tolerance override (fraction of GLYPH_SIZE). */
  tolerance?: number
  /** Optional guidance label, e.g. "van boven naar beneden". */
  hint?: string
}

/** A single character with its ordered strokes. */
export interface Glyph {
  char: string
  /** Ordered; index is the required stroke order. */
  strokes: Stroke[]
  metrics?: { baseline: number; xHeight: number; capHeight: number }
}

export type ContentType = 'letter' | 'number' | 'word' | 'sum'

/** A traceable exercise: one or more glyphs laid left-to-right. */
export interface ContentItem {
  id: string
  type: ContentType
  glyphs: Glyph[]
  prompt: string
  answer: string
  sum?: { a: number; op: '+' | '-'; b: number; result: number }
  tags?: string[]
  source: 'base' | 'user'
}

/** Import/export and base-data envelope. */
export interface ContentPack {
  schemaVersion: number
  name: string
  locale: string
  items: ContentItem[]
}
