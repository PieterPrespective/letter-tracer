// The tracing screen: canvas + HUD + feedback, driven by a TraceEngine. Detects
// stroke- and glyph-completion to fire pops, celebration, sound, and scoring.
// Returns a handle with destroy() so the app shell can tear it down cleanly.

import { CanvasSurface } from '../../render/canvas'
import { drawScene } from '../../render/glyph-renderer'
import { FeedbackLayer } from '../../render/feedback'
import { attachPointerInput } from '../../input/pointer'
import { glyphToCanvas } from '../../geometry/box'
import { TraceEngine } from '../../tracing/engine'
import { scoreGlyph } from '../../tracing/scoring'
import { playCelebrate, playStrokeDone, unlockAudio } from '../../util/audio'
import type { ContentItem } from '../../model/types'

export interface TraceScreenOptions {
  items: ContentItem[]
  index: number
  debug?: boolean
  onBack: () => void
  onNavigate: (index: number) => void
}

const TYPE_LABEL: Record<string, string> = { letter: 'Letter', number: 'Cijfer', word: 'Woord', sum: 'Som' }

export function createTraceScreen(root: HTMLElement, opts: TraceScreenOptions): { destroy: () => void } {
  const item = opts.items[opts.index]
  const glyph = item.glyphs[0]
  const label = TYPE_LABEL[item.type] ?? 'Letter'

  root.innerHTML = `
    <main class="trace-screen">
      <header class="hud">
        <button id="back" class="round" type="button" aria-label="Terug">←</button>
        <h1>${label} <span class="prompt"></span></h1>
        <span id="progress" class="progress-pill"></span>
        <button id="clear" class="round" type="button" aria-label="Opnieuw">↺</button>
      </header>
      <canvas id="trace"></canvas>
      <div class="tray">
        <p id="message" class="message" role="status" aria-live="polite"></p>
        <button id="next" class="next-btn" type="button" hidden>Volgende →</button>
      </div>
    </main>
  `
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  $('.prompt').textContent = item.prompt
  const canvas = $<HTMLCanvasElement>('#trace')
  canvas.setAttribute('aria-label', `Trace ${item.prompt}`)
  const message = $('#message')
  const progress = $('#progress')
  const nextBtn = $<HTMLButtonElement>('#next')

  const surface = new CanvasSurface(canvas)
  const engine = new TraceEngine(glyph)
  const feedback = new FeedbackLayer()

  let committed = 0
  let celebrated = false
  let dirty = true
  let raf = 0

  function strokeEndCanvas(strokeIndex: number) {
    const pts = glyph.strokes[strokeIndex].points
    return glyphToCanvas(pts[pts.length - 1], surface.transform)
  }

  function onChange() {
    dirty = true
    if (engine.completedTrails.length > committed) {
      committed = engine.completedTrails.length
      feedback.pop(strokeEndCanvas(committed - 1), performance.now())
      playStrokeDone()
    }
    if (engine.isComplete && !celebrated) {
      celebrated = true
      const { stars } = scoreGlyph(engine.meanDeviation, engine.tolerance)
      message.innerHTML = `Goed zo! <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`
      message.classList.add('done')
      nextBtn.hidden = false
      feedback.celebrate({ x: surface.cssWidth / 2, y: surface.cssHeight * 0.45 }, performance.now())
      playCelebrate()
    }
  }

  function updateHud() {
    const n = engine.strokeCount
    const done = Math.min(engine.currentStroke, n)
    progress.textContent = n > 1 ? `${engine.isComplete ? n : done + 1}/${n}` : ''
    if (!engine.isComplete) {
      message.classList.remove('done')
      message.textContent = engine.status === 'off-path' ? 'Begin bij de stip' : ''
    }
  }

  function frame() {
    const now = performance.now()
    if (dirty || feedback.active) {
      drawScene(surface, engine, { debug: opts.debug })
      feedback.draw(surface.ctx, now)
      updateHud()
      dirty = false
    }
    raf = requestAnimationFrame(frame)
  }

  const detachPointer = attachPointerInput(surface, engine, onChange)
  const onFirstDown = () => unlockAudio()
  canvas.addEventListener('pointerdown', onFirstDown, { once: true })

  $('#back').addEventListener('click', opts.onBack)
  $('#clear').addEventListener('click', () => {
    engine.reset()
    committed = 0
    celebrated = false
    nextBtn.hidden = true
    message.textContent = ''
    message.classList.remove('done')
    dirty = true
  })
  nextBtn.addEventListener('click', () => opts.onNavigate((opts.index + 1) % opts.items.length))

  const ro = new ResizeObserver(() => {
    surface.resize()
    dirty = true
  })
  ro.observe(canvas)

  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      detachPointer()
      canvas.removeEventListener('pointerdown', onFirstDown)
      root.innerHTML = ''
    },
  }
}
