// Tunable constants for the tracing experience. Centralised here so the
// forgiveness of the game can be tuned from on-device testing without hunting
// through the engine. Tolerances are fractions of the glyph box (0..GLYPH_SIZE);
// see docs in Prompts/lt-01/05-tracing-and-scoring.md.

/** Glyph coordinate box: strokes live in 0..GLYPH_SIZE on both axes, y-down. */
export const GLYPH_SIZE = 1000

/** CSS absolute-length conversion (1in = 96px = 2.54cm). */
export const CM_TO_CSS_PX = 96 / 2.54

/**
 * Below this on-screen glyph height, the row layout is too small to trace
 * comfortably, so we switch to focused (one-glyph-at-a-time) mode. Real-world
 * target: a glyph should be at least ~5 cm tall. (The 96px/in ↔ cm conversion
 * is nominal — on phones this is a heuristic, tuned up from 3 cm so short words
 * like "aap" also go focused on a phone.) See Prompts/lt-04.
 */
export const MIN_GLYPH_CM = 5

export interface TraceConfig {
  /** Base hit-test tolerance as a fraction of GLYPH_SIZE. */
  toleranceFraction: number
  /** Larger tolerance for landing on a stroke's start point. */
  startToleranceFraction: number
  /** Tolerance for the stroke's end point when checking completion. */
  endToleranceFraction: number
  /** Fraction of the stroke length that counts as "complete". */
  completeThreshold: number
  /** Allowed backward progress (fraction) before an input reads as off-path. */
  backslack: number
  /** Max forward jump in progress (fraction) — guards against corner-cutting. */
  maxForwardJump: number
  /** Uniform resample spacing for target strokes, in glyph units. */
  resampleSpacing: number
  /** Lifting the pen mid-stroke keeps progress and can be resumed. */
  allowResumeAfterLift: boolean
}

/** Defaults tuned for a 4–6 year-old (forgiving, not punishing). */
export const config: TraceConfig = {
  toleranceFraction: 0.1,
  startToleranceFraction: 0.14,
  endToleranceFraction: 0.12,
  completeThreshold: 0.92,
  backslack: 0.04,
  maxForwardJump: 0.15,
  resampleSpacing: 12,
  allowResumeAfterLift: true,
}
