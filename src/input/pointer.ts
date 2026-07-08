// Pointer Events → engine input. Unifies finger, S-Pen and mouse; captures the
// pen's high sample rate via coalesced events; tracks a single active pointer
// (with a pen-over-touch preference) for basic palm rejection.
// See Prompts/lt-01/04-rendering-and-input.md.

import type { CanvasSurface } from '../render/canvas'
import type { TraceEngine } from '../tracing/engine'

/**
 * Attach handlers; returns a disposer that removes them. `getEngine` is called
 * per event so the active engine can be swapped (e.g. advancing to the next
 * glyph of a word) without re-attaching listeners.
 */
export function attachPointerInput(
  surface: CanvasSurface,
  getEngine: () => TraceEngine,
  onChange: () => void,
): () => void {
  const canvas = surface.canvas
  let activeId: number | null = null
  let activeType: string | null = null

  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Ignore extra pointers, but let a pen take over from an in-progress touch.
    if (activeId !== null && !(e.pointerType === 'pen' && activeType === 'touch')) return
    activeId = e.pointerId
    activeType = e.pointerType
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      /* capture is best-effort */
    }
    e.preventDefault()
    getEngine().beginStroke(surface.clientToGlyph(e.clientX, e.clientY))
    onChange()
  }

  const move = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return
    if (e.buttons === 0) return // hover with no contact (S-Pen)
    e.preventDefault()
    // Coalesced events capture the pen's high report rate; fall back to the
    // event itself when the list is unavailable or empty.
    const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
    const events = coalesced.length > 0 ? coalesced : [e]
    for (const ev of events) getEngine().addPoint(surface.clientToGlyph(ev.clientX, ev.clientY))
    onChange()
  }

  const up = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return
    getEngine().endStroke()
    activeId = null
    activeType = null
    onChange()
  }

  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)

  return () => {
    canvas.removeEventListener('pointerdown', down)
    canvas.removeEventListener('pointermove', move)
    canvas.removeEventListener('pointerup', up)
    canvas.removeEventListener('pointercancel', up)
  }
}
