// Canvas setup: DPR-correct backing store, resize handling, and the glyph↔canvas
// transform. This is the only place device pixels are dealt with; everything
// downstream works in CSS pixels (rendering) or glyph space (logic).

import { type Transform, clientToGlyph, fitGlyphBox } from '../geometry/box'
import type { Point } from '../geometry/point'

const MAX_DPR = 3

export class CanvasSurface {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  cssWidth = 0
  cssHeight = 0
  transform: Transform = { scale: 1, offsetX: 0, offsetY: 0 }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')
    this.ctx = ctx
    this.resize()
  }

  /** Re-measure the element, rescale the backing store, recompute the transform. */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    this.cssWidth = rect.width
    this.cssHeight = rect.height
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr))
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr))
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.transform = fitGlyphBox(rect.width, rect.height)
  }

  /** Map a pointer event's client coordinates to glyph space. */
  clientToGlyph(clientX: number, clientY: number): Point {
    return clientToGlyph(clientX, clientY, this.canvas.getBoundingClientRect(), this.transform)
  }
}
