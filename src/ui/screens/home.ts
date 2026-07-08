// Home picker: category tabs (Letters / Cijfers / Woorden / Sommen) over a grid
// of glyph-preview tiles, reading from the content registry so parent-added
// words and sums appear. A parent-gated gear opens the editor.
// See Prompts/lt-01/07-ui-ux-and-feedback.md.

import { content } from '../../model/content'
import { drawGlyphsPreview } from '../../render/glyph-renderer'
import type { ContentItem } from '../../model/types'

export interface HomeScreenOptions {
  onSelect: (items: ContentItem[], index: number) => void
  onEditor: () => void
}

interface Category {
  key: string
  label: string
  items: ContentItem[]
  empty?: string
}

function categories(): Category[] {
  const digits = content.list('number').filter((i) => i.tags?.includes('cijfer'))
  return [
    { key: 'letters', label: 'Letters', items: content.list('letter') },
    { key: 'cijfers', label: 'Cijfers', items: digits },
    { key: 'woorden', label: 'Woorden', items: content.list('word'), empty: 'Nog geen woorden — voeg ze toe via ⚙.' },
    { key: 'sommen', label: 'Sommen', items: content.list('sum'), empty: 'Nog geen sommen — voeg ze toe via ⚙.' },
  ]
}

function tile(item: ContentItem): HTMLButtonElement {
  const multi = item.glyphs.length > 1
  const btn = document.createElement('button')
  btn.className = multi ? 'tile wide' : 'tile'
  btn.type = 'button'
  btn.setAttribute('aria-label', item.prompt)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  const h = 96
  const w = multi ? Math.min(96 + item.glyphs.length * 46, 280) : 96
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
    drawGlyphsPreview(ctx, item.glyphs, w, h)
  }
  btn.appendChild(canvas)
  return btn
}

export function createHomeScreen(root: HTMLElement, opts: HomeScreenOptions): { destroy: () => void } {
  const cats = categories()
  let activeKey = cats[0].key

  root.innerHTML = `
    <main class="home">
      <header class="home-head">
        <h1>Letter Tracer</h1>
        <button id="settings" class="round" type="button" aria-label="Voor de ouders">⚙</button>
      </header>
      <nav class="tabs" role="tablist"></nav>
      <div id="grid" class="grid"></div>
    </main>
  `
  const tabsEl = root.querySelector<HTMLElement>('.tabs')!
  const gridEl = root.querySelector<HTMLElement>('#grid')!

  function renderTabs() {
    tabsEl.innerHTML = ''
    for (const c of cats) {
      const b = document.createElement('button')
      b.className = 'tab' + (c.key === activeKey ? ' active' : '')
      b.type = 'button'
      b.textContent = c.label
      b.setAttribute('role', 'tab')
      b.setAttribute('aria-selected', String(c.key === activeKey))
      b.addEventListener('click', () => {
        activeKey = c.key
        renderTabs()
        renderGrid()
      })
      tabsEl.appendChild(b)
    }
  }

  function renderGrid() {
    const cat = cats.find((c) => c.key === activeKey)!
    gridEl.innerHTML = ''
    if (cat.items.length === 0) {
      const p = document.createElement('p')
      p.className = 'empty'
      p.textContent = cat.empty ?? 'Nog niets hier.'
      gridEl.appendChild(p)
      return
    }
    cat.items.forEach((item, i) => {
      const t = tile(item)
      t.addEventListener('click', () => opts.onSelect(cat.items, i))
      gridEl.appendChild(t)
    })
  }

  const settingsBtn = root.querySelector<HTMLButtonElement>('#settings')!
  const onSettings = () => openParentGate(opts.onEditor)
  settingsBtn.addEventListener('click', onSettings)

  renderTabs()
  renderGrid()

  return {
    destroy() {
      settingsBtn.removeEventListener('click', onSettings)
      root.innerHTML = ''
    },
  }
}

/** A lightweight adult check (a small sum) before opening the editor. */
function openParentGate(onPass: () => void): void {
  const a = 2 + Math.floor(Math.random() * 6)
  const b = 2 + Math.floor(Math.random() * 6)
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Voor de ouders">
      <p>Voor de ouders: hoeveel is <strong>${a} + ${b}</strong>?</p>
      <input id="gate" type="number" inputmode="numeric" aria-label="Antwoord" />
      <div class="modal-actions">
        <button id="cancel" type="button" class="ghost">Sluiten</button>
        <button id="ok" type="button">OK</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  const close = () => overlay.remove()
  overlay.querySelector('#cancel')!.addEventListener('click', close)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  const input = overlay.querySelector<HTMLInputElement>('#gate')!
  input.focus()
  const submit = () => {
    if (Number(input.value) === a + b) {
      overlay.remove()
      onPass()
    } else {
      overlay.querySelector('.modal')!.classList.add('shake')
      input.value = ''
      input.focus()
    }
  }
  overlay.querySelector('#ok')!.addEventListener('click', submit)
  input.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') submit()
  })
}
