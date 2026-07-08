// Home picker: category tabs (Letters / Cijfers / Woorden / Sommen) over a grid
// of glyph-preview tiles. A parent-gated settings panel toggles sound.
// See Prompts/lt-01/07-ui-ux-and-feedback.md.

import { listItems } from '../../model/glyph-library'
import { drawGlyphPreview } from '../../render/glyph-renderer'
import { getSettings, updateSettings } from '../../state/settings'
import type { ContentItem } from '../../model/types'

export interface HomeScreenOptions {
  onSelect: (items: ContentItem[], index: number) => void
}

interface Category {
  key: string
  label: string
  items: ContentItem[]
  empty?: string
}

function categories(): Category[] {
  const digits = listItems('number').filter((i) => i.tags?.includes('cijfer'))
  return [
    { key: 'letters', label: 'Letters', items: listItems('letter') },
    { key: 'cijfers', label: 'Cijfers', items: digits },
    { key: 'woorden', label: 'Woorden', items: listItems('word'), empty: 'Nog geen woorden — voeg ze straks toe.' },
    { key: 'sommen', label: 'Sommen', items: listItems('sum'), empty: 'Nog geen sommen — komt eraan.' },
  ]
}

function tile(item: ContentItem): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'tile'
  btn.type = 'button'
  btn.setAttribute('aria-label', item.prompt)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  const size = 96
  canvas.width = size * dpr
  canvas.height = size * dpr
  canvas.style.width = canvas.style.height = `${size}px`
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
    drawGlyphPreview(ctx, item.glyphs[0], size, size)
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
        <button id="settings" class="round" type="button" aria-label="Instellingen">⚙</button>
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
  const onSettings = () => openParentGate()
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

// --- Parent gate + settings ------------------------------------------------

function openParentGate(): void {
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
  overlay.querySelector('#ok')!.addEventListener('click', () => {
    if (Number(input.value) === a + b) {
      overlay.remove()
      openSettings()
    } else {
      overlay.querySelector('.modal')!.classList.add('shake')
      input.value = ''
      input.focus()
    }
  })
}

function openSettings(): void {
  const muted = getSettings().muted
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Instellingen">
      <h2>Instellingen</h2>
      <label class="row"><span>Geluid</span>
        <input id="sound" type="checkbox" ${muted ? '' : 'checked'} />
      </label>
      <div class="modal-actions"><button id="done" type="button">Klaar</button></div>
    </div>
  `
  document.body.appendChild(overlay)
  const sound = overlay.querySelector<HTMLInputElement>('#sound')!
  sound.addEventListener('change', () => updateSettings({ muted: !sound.checked }))
  const close = () => overlay.remove()
  overlay.querySelector('#done')!.addEventListener('click', close)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
}
