// Encouraging, generous scoring. A completed glyph always earns at least one
// star; accuracy (how close the child stayed to the path centre-line) lifts it
// to two or three. Pure — unit-tested in scoring.test.ts.
// See Prompts/lt-01/05-tracing-and-scoring.md.

import { clamp } from '../geometry/point'

export interface GlyphScore {
  /** 0..1, where 1 means dead-on the centre-line. */
  accuracy: number
  /** 1–3, never 0 for a completed glyph. */
  stars: 1 | 2 | 3
}

/** Accuracy/star cutoffs, tunable without touching the algorithm. */
export const SCORING = {
  twoStarAccuracy: 0.4,
  threeStarAccuracy: 0.7,
}

/**
 * Map the mean distance-from-path of accepted samples (glyph units) to a score,
 * relative to the stroke tolerance. Accepted samples are always within
 * tolerance, so accuracy lands in [0, 1].
 */
export function scoreGlyph(meanDeviation: number, tolerance: number): GlyphScore {
  const accuracy = tolerance <= 0 ? 1 : clamp(1 - meanDeviation / tolerance, 0, 1)
  const stars = accuracy >= SCORING.threeStarAccuracy ? 3 : accuracy >= SCORING.twoStarAccuracy ? 2 : 1
  return { accuracy, stars }
}
