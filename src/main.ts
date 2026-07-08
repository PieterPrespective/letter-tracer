// M0 demo entry point: render the hard-coded 'a' and let the child trace it
// with finger or S-Pen. This wiring is deliberately thin — the home picker,
// content model UI, and celebration effects arrive in later milestones.

import './style.css'
import { CanvasSurface } from './render/canvas'
import { drawScene } from './render/glyph-renderer'
import { attachPointerInput } from './input/pointer'
import { TraceEngine } from './tracing/engine'
import { demoGlyphA } from './data/demo-glyph'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="trace-screen">
    <header class="hud">
      <h1>Letter <span class="prompt">a</span></h1>
      <button id="clear" type="button">Opnieuw</button>
    </header>
    <canvas id="trace" aria-label="Trace de letter a"></canvas>
    <p id="message" class="message" role="status" aria-live="polite"></p>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('#trace')!
const message = document.querySelector<HTMLParagraphElement>('#message')!
const clearBtn = document.querySelector<HTMLButtonElement>('#clear')!

const surface = new CanvasSurface(canvas)
let engine = new TraceEngine(demoGlyphA)

let dirty = true
const invalidate = () => {
  dirty = true
}

function updateMessage() {
  message.textContent = engine.isComplete
    ? 'Goed zo! 🎉'
    : engine.status === 'off-path'
      ? 'Begin bij de stip'
      : ''
  message.classList.toggle('done', engine.isComplete)
}

function frame() {
  if (dirty) {
    drawScene(surface, engine)
    updateMessage()
    dirty = false
  }
  requestAnimationFrame(frame)
}

attachPointerInput(surface, engine, invalidate)

clearBtn.addEventListener('click', () => {
  engine.reset()
  invalidate()
})

const ro = new ResizeObserver(() => {
  surface.resize()
  invalidate()
})
ro.observe(canvas)

requestAnimationFrame(frame)
