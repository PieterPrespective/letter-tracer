// Kid-friendly feedback animations drawn on top of the trace scene: a quick
// expanding ring when a stroke completes, and a star-burst celebration when the
// whole glyph is done. Respects prefers-reduced-motion.
// See Prompts/lt-01/07-ui-ux-and-feedback.md.

import type { Point } from '../geometry/point'

interface Pop {
  x: number
  y: number
  start: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  hue: number
}

interface Burst {
  start: number
  particles: Particle[]
}

const POP_MS = 380
const BURST_MS = 1300
const STAR_COLORS = ['#f4c430', '#e2683c', '#6c9bd1', '#3f8f52']

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.45
    const px = x + Math.cos(a) * rad
    const py = y + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

export class FeedbackLayer {
  private pops: Pop[] = []
  private bursts: Burst[] = []
  private reduce = prefersReducedMotion()

  /** Trigger a stroke-complete ring at a canvas-space point. */
  pop(p: Point, now: number): void {
    this.pops.push({ x: p.x, y: p.y, start: now })
  }

  /** Trigger a glyph-complete celebration centred on a canvas-space point. */
  celebrate(center: Point, now: number): void {
    const count = this.reduce ? 8 : 26
    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const a = (2 * Math.PI * i) / count + (i % 2) * 0.2
      const speed = (this.reduce ? 0.06 : 0.12) + (i % 3) * 0.03
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        hue: i,
      })
    }
    this.bursts.push({ start: now, particles })
  }

  /** True while an animation is still playing (keeps the render loop alive). */
  get active(): boolean {
    return this.pops.length > 0 || this.bursts.length > 0
  }

  /** Draw all active feedback and prune finished animations. */
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    for (const p of this.pops) {
      const t = (now - p.start) / POP_MS
      if (t >= 1) continue
      const r = 12 + t * 46
      ctx.globalAlpha = 1 - t
      ctx.strokeStyle = '#3f8f52'
      ctx.lineWidth = 5 * (1 - t) + 1
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI)
      ctx.stroke()
    }
    this.pops = this.pops.filter((p) => now - p.start < POP_MS)

    for (const b of this.bursts) {
      const t = (now - b.start) / BURST_MS
      if (t >= 1) continue
      const dt = now - b.start
      ctx.globalAlpha = 1 - t
      for (const p of b.particles) {
        const px = p.x + p.vx * dt
        const py = p.y + p.vy * dt + 0.00018 * dt * dt // gentle gravity
        star(ctx, px, py, 10 * (1 - t * 0.5), STAR_COLORS[p.hue % STAR_COLORS.length])
      }
    }
    this.bursts = this.bursts.filter((b) => now - b.start < BURST_MS)

    ctx.globalAlpha = 1
  }
}
