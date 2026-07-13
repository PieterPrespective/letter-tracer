// The tracing screen. Handles a single glyph or a multi-glyph word/sum, traced
// left-to-right with auto-advance. Two layouts (Prompts/lt-04): "row" shows the
// whole exercise at once; "focused" shows one big glyph at a time with a compact
// word strip — chosen so a glyph is never smaller than ~3cm (or forced via the
// "grote letters" setting). Returns a destroy() handle for clean teardown.

import { CanvasSurface } from '../../render/canvas'
import { drawWordScene, drawGlyphsPreview } from '../../render/glyph-renderer'
import { FeedbackLayer } from '../../render/feedback'
import { attachPointerInput } from '../../input/pointer'
import { glyphToCanvas } from '../../geometry/box'
import { type TraceMode, chooseTraceMode, layoutGlyphs } from '../../geometry/layout'
import { GLYPH_SIZE } from '../../config'
import { TraceEngine } from '../../tracing/engine'
import { handsForCount } from '../../model/fingers'
import { handSVG } from '../../render/hand'
import { scoreGlyph } from '../../tracing/scoring'
import { playCelebrate, playStrokeDone, unlockAudio } from '../../util/audio'
import { cancelSpeech, pronounceItem } from '../../util/speech'
import { sayWithHint } from '../say'
import { canvasColors, onThemeChange } from '../../theme'
import { getSettings, type PracticeMode } from '../../state/settings'
import { canChoose } from '../../model/select-game'
import { modeToggleHTML, wireModeToggle } from '../components/mode-toggle'
import type { Transform } from '../../geometry/box'
import type { ContentItem } from '../../model/types'

export interface TraceScreenOptions {
  items: ContentItem[]
  index: number
  debug?: boolean
  onBack: () => void
  onNavigate: (index: number) => void
  onSetMode?: (mode: PracticeMode) => void
}

const TYPE_LABEL: Record<string, string> = { letter: 'Letter', number: 'Cijfer', word: 'Woord', sum: 'Som' }

type SumRole = { kind: 'operand'; value: number } | { kind: 'op' } | { kind: 'equals' } | { kind: 'result'; value: number }

/** One role per glyph of a sum, so focused mode can show the right hands. */
function sumRoles(sum: { a: number; op: '+' | '-'; b: number; result: number }): SumRole[] {
  const roles: SumRole[] = []
  for (const _ of String(sum.a)) roles.push({ kind: 'operand', value: sum.a })
  roles.push({ kind: 'op' })
  for (const _ of String(sum.b)) roles.push({ kind: 'operand', value: sum.b })
  roles.push({ kind: 'equals' })
  for (const _ of String(sum.result)) roles.push({ kind: 'result', value: sum.result })
  return roles
}

export function createTraceScreen(root: HTMLElement, opts: TraceScreenOptions): { destroy: () => void } {
  const item = opts.items[opts.index]
  const glyphs = item.glyphs
  const label = TYPE_LABEL[item.type] ?? 'Letter'
  const roles = item.type === 'sum' && item.sum ? sumRoles(item.sum) : []

  root.innerHTML = `
    <main class="trace-screen">
      <header class="hud">
        <button id="back" class="round" type="button" aria-label="Terug">←</button>
        <h1>${label} <span class="prompt"></span></h1>
        <span id="progress" class="progress-pill"></span>
        <button id="say" class="round" type="button" aria-label="Uitspraak">🔊</button>
        <button id="clear" class="round" type="button" aria-label="Opnieuw">↺</button>
      </header>
      ${opts.onSetMode && canChoose(item) ? modeToggleHTML('overtrekken') : ''}
      <div id="wordstrip" class="wordstrip" hidden></div>
      <canvas id="trace"></canvas>
      <div id="fingers" class="fingers" hidden></div>
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
  const fingersEl = $<HTMLDivElement>('#fingers')
  const wordstrip = $<HTMLDivElement>('#wordstrip')

  const surface = new CanvasSurface(canvas)
  const feedback = new FeedbackLayer()

  let mode: TraceMode = 'row'
  let layout: Transform[] = layoutGlyphs(glyphs.length, surface.cssWidth, surface.cssHeight)
  let current = 0
  let engine = new TraceEngine(glyphs[current])

  let committed = 0
  let devTotal = 0
  let devCount = 0
  let celebrated = false
  let revealStart = 0
  let dirty = true
  let raf = 0

  const TRACE_OPACITY = 0.14
  const REVEAL_OPACITY = 0.55

  function handGroup(count: number): HTMLElement {
    const group = document.createElement('div')
    group.className = 'hand-group'
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', `${count}`)
    for (const h of handsForCount(count)) {
      const holder = document.createElement('div')
      holder.innerHTML = handSVG(h.fingers, h.hand)
      if (holder.firstElementChild) group.appendChild(holder.firstElementChild)
    }
    return group
  }

  // Finger aid: in focused mode show only the current operand's hands; in row
  // mode show both operands with the operator (there's room on a wide screen).
  function renderFingers() {
    fingersEl.innerHTML = ''
    if (item.type !== 'sum' || !item.sum) {
      fingersEl.hidden = true
      return
    }
    if (mode === 'focused') {
      const role = roles[current]
      if (role && role.kind === 'operand') {
        fingersEl.hidden = false
        fingersEl.appendChild(handGroup(role.value))
      } else {
        fingersEl.hidden = true
      }
      return
    }
    fingersEl.hidden = false
    fingersEl.appendChild(handGroup(item.sum.a))
    const op = document.createElement('span')
    op.className = 'op'
    op.textContent = item.sum.op === '+' ? '+' : '−'
    fingersEl.appendChild(op)
    fingersEl.appendChild(handGroup(item.sum.b))
  }

  // Compact whole-word context in focused mode: mini previews, active highlighted.
  function renderStrip() {
    if (mode !== 'focused' || glyphs.length <= 1) {
      wordstrip.hidden = true
      wordstrip.innerHTML = ''
      return
    }
    wordstrip.hidden = false
    wordstrip.innerHTML = ''
    const c = canvasColors()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = 40
    glyphs.forEach((g, i) => {
      const cv = document.createElement('canvas')
      cv.width = size * dpr
      cv.height = size * dpr
      cv.style.width = `${size}px`
      cv.style.height = `${size}px`
      cv.className = 'strip-glyph' + (i === current ? ' active' : i < current ? ' done' : '')
      const ctx = cv.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        drawGlyphsPreview(ctx, [g], size, size, i < current ? c.ink : i === current ? c.inkActive : c.guide)
      }
      wordstrip.appendChild(cv)
    })
  }

  function computeLayout() {
    const rowLayout = layoutGlyphs(glyphs.length, surface.cssWidth, surface.cssHeight)
    const rowGlyphPx = GLYPH_SIZE * rowLayout[0].scale
    mode = chooseTraceMode(rowGlyphPx, getSettings().groteLetters, glyphs.length)
    layout = mode === 'focused' ? glyphs.map(() => layoutGlyphs(1, surface.cssWidth, surface.cssHeight)[0]) : rowLayout
    surface.transform = layout[current]
    renderStrip()
    renderFingers()
  }

  // Keep transform / strip / fingers in sync after `current` changes.
  function syncCurrent() {
    surface.transform = layout[current]
    renderStrip()
    renderFingers()
  }

  function strokeEndCanvas(strokeIndex: number) {
    const pts = glyphs[current].strokes[strokeIndex].points
    return glyphToCanvas(pts[pts.length - 1], surface.transform)
  }

  function finishWord() {
    celebrated = true
    revealStart = performance.now()
    const { stars } = scoreGlyph(devCount > 0 ? devTotal / devCount : 0, engine.tolerance)
    message.innerHTML = `Goed zo! <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`
    message.classList.add('done')
    nextBtn.hidden = false
    feedback.celebrate({ x: surface.cssWidth / 2, y: surface.cssHeight * 0.45 }, performance.now())
    playCelebrate()
    pronounceItem(item)
  }

  function onChange() {
    dirty = true
    if (engine.completedTrails.length > committed) {
      committed = engine.completedTrails.length
      feedback.pop(strokeEndCanvas(committed - 1), performance.now())
      playStrokeDone()
    }
    if (engine.isComplete && !celebrated) {
      devTotal += engine.meanDeviation
      devCount++
      if (current < glyphs.length - 1) {
        current++
        engine = new TraceEngine(glyphs[current])
        committed = 0
        syncCurrent()
        playStrokeDone()
      } else {
        finishWord()
      }
    }
  }

  function updateHud() {
    if (glyphs.length > 1) {
      progress.textContent = `${current + 1}/${glyphs.length}`
    } else {
      const n = engine.strokeCount
      progress.textContent = n > 1 ? `${engine.isComplete ? n : Math.min(engine.currentStroke + 1, n)}/${n}` : ''
    }
    if (!celebrated) {
      message.classList.remove('done')
      message.textContent = engine.status === 'off-path' ? 'Begin bij de stip' : ''
    }
  }

  function imageOpacity(now: number): number {
    if (!celebrated) return TRACE_OPACITY
    const t = Math.min((now - revealStart) / 600, 1)
    return TRACE_OPACITY + (REVEAL_OPACITY - TRACE_OPACITY) * t
  }

  function frame() {
    const now = performance.now()
    const revealing = celebrated && now - revealStart < 600
    if (dirty || feedback.active || revealing) {
      drawWordScene(surface, layout, glyphs, current, engine, {
        debug: opts.debug,
        image: item.image,
        imageOpacity: imageOpacity(now),
        focused: mode === 'focused',
      })
      feedback.draw(surface.ctx, now)
      updateHud()
      dirty = false
    }
    raf = requestAnimationFrame(frame)
  }

  const detachPointer = attachPointerInput(surface, () => engine, onChange)
  const onFirstDown = () => unlockAudio()
  canvas.addEventListener('pointerdown', onFirstDown, { once: true })

  if (opts.onSetMode) wireModeToggle(root, 'overtrekken', opts.onSetMode)

  $('#back').addEventListener('click', opts.onBack)
  $('#say').addEventListener('click', () => sayWithHint(item))
  $('#clear').addEventListener('click', () => {
    current = 0
    engine = new TraceEngine(glyphs[current])
    committed = 0
    devTotal = 0
    devCount = 0
    celebrated = false
    nextBtn.hidden = true
    message.textContent = ''
    message.classList.remove('done')
    syncCurrent()
    dirty = true
  })
  nextBtn.addEventListener('click', () => opts.onNavigate((opts.index + 1) % opts.items.length))

  const ro = new ResizeObserver(() => {
    surface.resize()
    computeLayout()
    dirty = true
  })
  ro.observe(canvas)

  // Canvas colours don't follow CSS automatically — redraw + repaint the strip.
  const unsubTheme = onThemeChange(() => {
    renderStrip()
    dirty = true
  })

  computeLayout()
  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      detachPointer()
      unsubTheme()
      cancelSpeech()
      canvas.removeEventListener('pointerdown', onFirstDown)
      root.innerHTML = ''
    },
  }
}
