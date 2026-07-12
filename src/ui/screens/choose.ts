// The "Kies" (choose) screen: the child sees a word's picture (or a sum as
// finger-hands with the result hidden) and assembles the answer in scroll
// selectors, then presses Controleer. Only wrong slots are flagged; "Toon
// antwoord" reveals the spelling to relieve frustration. Reuses the finger aid,
// celebration, audio and Dutch pronunciation. See Prompts/lt-06/03-*.md.

import { buildPuzzle, checkPuzzle, isSolved } from '../../model/select-game'
import { createScrollSelector, type ScrollSelector } from '../components/scroll-selector'
import { modeToggleHTML, wireModeToggle } from '../components/mode-toggle'
import { handsForCount } from '../../model/fingers'
import { handSVG } from '../../render/hand'
import { FeedbackLayer } from '../../render/feedback'
import { playCelebrate, unlockAudio } from '../../util/audio'
import { cancelSpeech, pronounceItem } from '../../util/speech'
import type { PracticeMode } from '../../state/settings'
import type { ContentItem } from '../../model/types'

export interface ChooseScreenOptions {
  items: ContentItem[]
  index: number
  onBack: () => void
  onNavigate: (index: number) => void
  onSetMode?: (mode: PracticeMode) => void
}

const TYPE_LABEL: Record<string, string> = { word: 'Woord', sum: 'Som' }

export function createChooseScreen(root: HTMLElement, opts: ChooseScreenOptions): { destroy: () => void } {
  const item = opts.items[opts.index]
  const puzzle = buildPuzzle(item)
  const label = TYPE_LABEL[item.type] ?? 'Kies'

  root.innerHTML = `
    <main class="choose-screen">
      <header class="hud">
        <button id="back" class="round" type="button" aria-label="Terug">←</button>
        <h1>${label} <span class="prompt"></span></h1>
        <button id="say" class="round" type="button" aria-label="Uitspraak">🔊</button>
      </header>
      ${opts.onSetMode ? modeToggleHTML('kiezen') : ''}
      <div id="prompt" class="choose-prompt"></div>
      <div id="wheels" class="wheels" role="group" aria-label="Kies de ${item.type === 'sum' ? 'cijfers' : 'letters'}"></div>
      <div class="tray choose-tray">
        <p id="message" class="message" role="status" aria-live="polite"></p>
        <div class="choose-buttons">
          <button id="check" class="next-btn" type="button">Controleer</button>
          <button id="reveal" class="ghost-btn" type="button">Toon antwoord</button>
          <button id="next" class="next-btn" type="button" hidden>Volgende →</button>
        </div>
      </div>
      <canvas id="celebrate" class="celebrate-layer" aria-hidden="true"></canvas>
    </main>
  `
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  $('.prompt').textContent = item.prompt
  const promptEl = $('#prompt')
  const wheelsEl = $('#wheels')
  const message = $('#message')
  const checkBtn = $<HTMLButtonElement>('#check')
  const revealBtn = $<HTMLButtonElement>('#reveal')
  const nextBtn = $<HTMLButtonElement>('#next')

  // ---- Prompt (picture or finger-hands, result hidden) ----------------------
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

  function renderPrompt(): void {
    promptEl.innerHTML = ''
    if (puzzle.prompt.kind === 'image') {
      const img = puzzle.prompt.image
      if (img.kind === 'emoji') {
        const span = document.createElement('span')
        span.className = 'choose-emoji'
        span.setAttribute('aria-hidden', 'true')
        span.textContent = img.value
        promptEl.appendChild(span)
      } else {
        const el = document.createElement('img')
        el.className = 'choose-image'
        el.src = img.value
        el.alt = ''
        promptEl.appendChild(el)
      }
    } else {
      const { a, op, b } = puzzle.prompt
      const fingers = document.createElement('div')
      fingers.className = 'fingers'
      fingers.appendChild(handGroup(a))
      const opEl = document.createElement('span')
      opEl.className = 'op'
      opEl.textContent = op === '+' ? '+' : '−'
      fingers.appendChild(opEl)
      fingers.appendChild(handGroup(b))
      promptEl.appendChild(fingers)
    }
  }

  // ---- Wheels ---------------------------------------------------------------
  const selectors: ScrollSelector[] = puzzle.slots.map((slot, i) => {
    const sel = createScrollSelector({
      choices: slot.choices,
      ariaLabel: `${slot.kind === 'digit' ? 'Cijfer' : 'Letter'} ${i + 1} van ${puzzle.slots.length}`,
      onChange: () => {
        // Clear a previous "wrong" flag as soon as the child re-picks.
        sel.setState('idle')
        if (!solved) setMessage('')
      },
    })
    wheelsEl.appendChild(sel.el)
    return sel
  })

  // ---- Celebration overlay (reuses the trace star-burst) --------------------
  const feedback = new FeedbackLayer()
  const cel = $<HTMLCanvasElement>('#celebrate')
  const celCtx = cel.getContext('2d')
  let celRaf = 0
  function celebrate(): void {
    if (!celCtx) return
    const rect = cel.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cel.width = rect.width * dpr
    cel.height = rect.height * dpr
    celCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    feedback.celebrate({ x: rect.width / 2, y: rect.height * 0.4 }, performance.now())
    const step = () => {
      const now = performance.now()
      celCtx.clearRect(0, 0, rect.width, rect.height)
      feedback.draw(celCtx, now)
      if (feedback.active) celRaf = requestAnimationFrame(step)
    }
    celRaf = requestAnimationFrame(step)
  }

  // ---- Flow -----------------------------------------------------------------
  let solved = false
  function setMessage(text: string, done = false): void {
    message.textContent = text
    message.classList.toggle('done', done)
  }

  function finish(revealed: boolean): void {
    solved = true
    for (const s of selectors) s.setState('correct')
    checkBtn.hidden = true
    revealBtn.hidden = true
    nextBtn.hidden = false
    if (revealed) {
      setMessage('Zo schrijf je het.')
    } else {
      setMessage('Goed zo!', true)
      celebrate()
      playCelebrate()
    }
    pronounceItem(item)
  }

  function onCheck(): void {
    if (solved) return
    const results = checkPuzzle(
      puzzle,
      selectors.map((s) => s.value()),
    )
    for (const r of results) selectors[r.index].setState(r.correct ? 'correct' : 'wrong')
    if (isSolved(results)) finish(false)
    else setMessage('Bijna! Kijk nog eens naar de rode.')
  }

  function onReveal(): void {
    if (solved) return
    puzzle.slots.forEach((slot, i) => selectors[i].setValue(slot.answer, { animate: true }))
    finish(true)
  }

  renderPrompt()
  checkBtn.addEventListener('click', onCheck)
  revealBtn.addEventListener('click', onReveal)
  nextBtn.addEventListener('click', () => opts.onNavigate((opts.index + 1) % opts.items.length))
  $('#back').addEventListener('click', opts.onBack)
  $('#say').addEventListener('click', () => pronounceItem(item))

  const onFirstDown = () => unlockAudio()
  root.addEventListener('pointerdown', onFirstDown, { once: true })

  if (opts.onSetMode) wireModeToggle(root, 'kiezen', opts.onSetMode)

  return {
    destroy() {
      cancelAnimationFrame(celRaf)
      for (const s of selectors) s.destroy()
      root.removeEventListener('pointerdown', onFirstDown)
      cancelSpeech()
      root.innerHTML = ''
    },
  }
}
