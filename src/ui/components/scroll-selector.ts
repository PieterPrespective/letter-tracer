// A kid-friendly vertical wheel picker: one value chosen from a list (a letter
// or a digit). Touch-first, built on native scroll-snap so Android flick physics
// and momentum come for free; ▲/▼ steppers and arrow keys give precision. The
// selected value is read from the scroll offset via the pure wheel-snap math.
// See Prompts/lt-06/02-scroll-selector-component.md.

import { indexForOffset, offsetForIndex } from './wheel-snap'

/** Row height in CSS px; the viewport shows three rows (one above/below). */
export const ITEM_H = 56

export interface ScrollSelectorOptions {
  choices: string[]
  initial?: string
  ariaLabel: string
  onChange?: (value: string) => void
}

export type SelectorState = 'idle' | 'correct' | 'wrong'

export interface ScrollSelector {
  el: HTMLElement
  value(): string
  setValue(v: string, opts?: { animate?: boolean }): void
  setState(state: SelectorState): void
  destroy(): void
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createScrollSelector(opts: ScrollSelectorOptions): ScrollSelector {
  const { choices, ariaLabel } = opts
  const clamp = (i: number) => Math.max(0, Math.min(choices.length - 1, i))
  let index = clamp(Math.max(0, choices.indexOf(opts.initial ?? choices[0])))
  let locked = false

  const el = document.createElement('div')
  el.className = 'scroll-selector'

  const up = document.createElement('button')
  up.type = 'button'
  up.className = 'wheel-btn'
  up.textContent = '▲'
  up.setAttribute('aria-label', 'Omhoog')

  const window_ = document.createElement('div')
  window_.className = 'wheel-window'

  const viewport = document.createElement('div')
  viewport.className = 'wheel-viewport'
  viewport.setAttribute('role', 'listbox')
  viewport.setAttribute('aria-label', ariaLabel)
  viewport.tabIndex = 0

  const track = document.createElement('div')
  track.className = 'wheel-track'
  const items = choices.map((c, i) => {
    const it = document.createElement('div')
    it.className = 'wheel-item'
    it.textContent = c
    it.setAttribute('role', 'option')
    it.dataset.index = String(i)
    return it
  })
  for (const it of items) track.appendChild(it)
  viewport.appendChild(track)

  const band = document.createElement('div')
  band.className = 'wheel-band'
  band.setAttribute('aria-hidden', 'true')

  window_.append(viewport, band)

  const down = document.createElement('button')
  down.type = 'button'
  down.className = 'wheel-btn'
  down.textContent = '▼'
  down.setAttribute('aria-label', 'Omlaag')

  el.append(up, window_, down)

  function paintSelected(): void {
    items.forEach((it, k) => {
      const on = k === index
      it.classList.toggle('selected', on)
      it.setAttribute('aria-selected', String(on))
    })
  }

  // Apply an index change from any source. `fire` distinguishes user-driven
  // changes (notify) from programmatic ones (setValue / initial layout).
  function apply(i: number, o: { scroll: boolean; animate?: boolean; fire?: boolean }): void {
    index = clamp(i)
    paintSelected()
    if (o.scroll) viewport.scrollTo({ top: offsetForIndex(index, ITEM_H), behavior: o.animate ? 'smooth' : 'auto' })
    if (o.fire) opts.onChange?.(choices[index])
  }

  function step(d: number): void {
    if (locked) return
    const i = clamp(index + d)
    if (i !== index) apply(i, { scroll: true, animate: true, fire: true })
  }

  // Settle to the nearest item after the user scrolls, and notify if it moved.
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  function settle(): void {
    const i = indexForOffset(viewport.scrollTop, ITEM_H, choices.length)
    if (i !== index) apply(i, { scroll: false, fire: true })
  }
  function onScroll(): void {
    clearTimeout(settleTimer)
    settleTimer = setTimeout(settle, 90)
  }

  function onKey(e: KeyboardEvent): void {
    if (locked) return
    let i = index
    if (e.key === 'ArrowUp') i--
    else if (e.key === 'ArrowDown') i++
    else if (e.key === 'Home') i = 0
    else if (e.key === 'End') i = choices.length - 1
    else return
    e.preventDefault()
    if (clamp(i) !== index) apply(i, { scroll: true, animate: true, fire: true })
  }

  function onTrackClick(e: MouseEvent): void {
    if (locked) return
    const t = (e.target as HTMLElement).closest<HTMLElement>('.wheel-item')
    if (!t) return
    const i = Number(t.dataset.index)
    if (i !== index) apply(i, { scroll: true, animate: true, fire: true })
  }

  up.addEventListener('click', () => step(-1))
  down.addEventListener('click', () => step(1))
  viewport.addEventListener('scroll', onScroll, { passive: true })
  viewport.addEventListener('keydown', onKey)
  track.addEventListener('click', onTrackClick)

  paintSelected()
  // The element isn't in the DOM yet at creation; centre the initial item once
  // the screen has appended it and layout exists.
  const initRaf = requestAnimationFrame(() => (viewport.scrollTop = offsetForIndex(index, ITEM_H)))

  return {
    el,
    value: () => choices[index],
    setValue(v, o) {
      const i = choices.indexOf(v)
      if (i < 0) return
      apply(i, { scroll: true, animate: o?.animate })
    },
    setState(state) {
      el.classList.toggle('correct', state === 'correct')
      el.classList.toggle('wrong', state === 'wrong')
      locked = state === 'correct'
      viewport.style.pointerEvents = locked ? 'none' : ''
      up.disabled = down.disabled = locked
      if (state === 'wrong' && !prefersReducedMotion()) {
        el.classList.remove('shake')
        void el.offsetWidth // restart the animation
        el.classList.add('shake')
      }
    },
    destroy() {
      cancelAnimationFrame(initRaf)
      clearTimeout(settleTimer)
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('keydown', onKey)
      track.removeEventListener('click', onTrackClick)
      el.remove()
    },
  }
}
