// M1 trace screen: load a glyph from the validated base content and let the
// child trace it with finger or S-Pen. Glyph selected via ?char= (default 'a');
// ?debug=1 shows the authoring overlay (start dots, order numbers, direction
// arrows) for reviewing schrijfrichting. The home picker arrives in M2.

import './style.css'
import { CanvasSurface } from './render/canvas'
import { drawScene } from './render/glyph-renderer'
import { attachPointerInput } from './input/pointer'
import { TraceEngine } from './tracing/engine'
import { itemForChar } from './model/glyph-library'
import { demoGlyphA } from './data/demo-glyph'

const params = new URLSearchParams(location.search)
const debug = params.has('debug')
const requested = params.get('char') ?? 'a'
const item = itemForChar(requested) ?? itemForChar('a')
const glyph = item?.glyphs[0] ?? demoGlyphA
const prompt = item?.prompt ?? 'a'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="trace-screen">
    <header class="hud">
      <h1>Letter <span class="prompt"></span></h1>
      <button id="clear" type="button">Opnieuw</button>
    </header>
    <canvas id="trace" aria-label="Trace de letter"></canvas>
    <p id="message" class="message" role="status" aria-live="polite"></p>
  </main>
`
app.querySelector<HTMLSpanElement>('.prompt')!.textContent = prompt
app.querySelector<HTMLCanvasElement>('#trace')!.setAttribute('aria-label', `Trace ${prompt}`)

const canvas = document.querySelector<HTMLCanvasElement>('#trace')!
const message = document.querySelector<HTMLParagraphElement>('#message')!
const clearBtn = document.querySelector<HTMLButtonElement>('#clear')!

const surface = new CanvasSurface(canvas)
const engine = new TraceEngine(glyph)

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
    drawScene(surface, engine, { debug })
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
