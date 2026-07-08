// The vector primitive and a few pure operations on it. This is the lowest
// layer — it imports nothing — so everything else can depend on it freely.

export interface Point {
  x: number
  y: number
}

export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })

/** Linear interpolation from a to b at parameter t (t=0 → a, t=1 → b). */
export const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v
