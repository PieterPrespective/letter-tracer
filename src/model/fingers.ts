// Decompose a count into hands of at most five fingers, for the finger-counting
// aid on sums. See Prompts/lt-03/01-finger-counting-sums.md.

export interface HandSpec {
  fingers: number
  hand: 'left' | 'right'
}

/**
 * Split a count into 1+ hands (right, then left, alternating) each showing at
 * most 5 fingers. 0 → a single fist; 7 → [5 right, 2 left].
 */
export function handsForCount(n: number): HandSpec[] {
  let rem = Math.max(0, Math.floor(n))
  const hands: HandSpec[] = []
  let side: 'left' | 'right' = 'right'
  while (rem > 0) {
    const fingers = Math.min(5, rem)
    hands.push({ fingers, hand: side })
    rem -= fingers
    side = side === 'right' ? 'left' : 'right'
  }
  if (hands.length === 0) hands.push({ fingers: 0, hand: 'right' })
  return hands
}
