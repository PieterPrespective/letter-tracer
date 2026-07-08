// A stylised hand drawn as an inline SVG, with `fingers` (0..5) extended. Uses
// currentColor so it themes via CSS; mirrored for the left hand. Extended digits
// are full capsules, folded ones short stubs. See Prompts/lt-03/01-finger-counting-sums.md.

const FINGER_X = [30, 44, 58, 72] // index, middle, ring, pinky
const PALM_TOP = 64

function fingerRect(x: number, up: boolean): string {
  const y = up ? 16 : 48
  const h = PALM_TOP + 8 - y // extend a little into the palm
  return `<rect x="${x}" y="${y}" width="12" height="${h}" rx="6" />`
}

/** Inline SVG markup for a hand showing `fingers` extended (0..5). */
export function handSVG(fingers: number, hand: 'left' | 'right'): string {
  const n = Math.max(0, Math.min(5, Math.floor(fingers)))
  const parts: string[] = []

  // Four fingers (index..pinky) extend as the count rises 1→4.
  for (let i = 0; i < 4; i++) parts.push(fingerRect(FINGER_X[i], n > i))

  // Thumb sticks out to the side at 5; otherwise tucks against the palm.
  parts.push(
    n >= 5
      ? '<rect x="6" y="66" width="13" height="46" rx="6.5" transform="rotate(-38 12.5 112)" />'
      : '<rect x="16" y="84" width="13" height="30" rx="6.5" transform="rotate(-12 22.5 114)" />',
  )

  // Palm last so it sits over the finger/thumb bases.
  parts.push(`<rect x="24" y="${PALM_TOP}" width="52" height="58" rx="18" />`)

  const flip = hand === 'left' ? ' transform="scale(-1,1) translate(-100,0)"' : ''
  return `<svg viewBox="0 0 100 130" class="hand" role="img" aria-label="hand met ${n} vingers"><g fill="currentColor"${flip}>${parts.join('')}</g></svg>`
}
