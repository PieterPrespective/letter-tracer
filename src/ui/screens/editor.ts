// Parent-facing editor: add words and sums, manage saved content, toggle sound,
// and import/export content packs. Reached via the parent gate on the home
// screen. See Prompts/lt-01/06-storage-and-content-editor.md.

import { content } from '../../model/content'
import { composeSum, composeWord } from '../../model/compose'
import { getSettings, updateSettings, type ThemeSetting } from '../../state/settings'
import { applyTheme } from '../../theme'
import type { ContentItem } from '../../model/types'

export interface EditorScreenOptions {
  onBack: () => void
}

export function createEditorScreen(root: HTMLElement, opts: EditorScreenOptions): { destroy: () => void } {
  root.innerHTML = `
    <main class="editor">
      <header class="hud">
        <button id="back" class="round" type="button" aria-label="Terug">←</button>
        <h1>Voor de ouders</h1>
      </header>
      <div class="editor-body">
        <section class="card">
          <label class="row"><span>Geluid aan</span><input id="sound" type="checkbox" /></label>
        </section>

        <section class="card">
          <div class="row"><span>Weergave</span></div>
          <div class="segmented" id="theme" role="group" aria-label="Weergave">
            <button type="button" data-theme-val="system">Systeem</button>
            <button type="button" data-theme-val="light">Licht</button>
            <button type="button" data-theme-val="dark">Donker</button>
          </div>
        </section>

        <section class="card">
          <h2>Nieuw woord</h2>
          <div class="form-row">
            <input id="word" type="text" placeholder="bijv. kat" autocomplete="off" aria-label="Woord" />
            <button id="addWord" type="button">Toevoegen</button>
          </div>
          <div class="emoji-picker" id="emojiPicker" role="group" aria-label="Plaatje"></div>
          <p id="wordMsg" class="form-msg" role="status" aria-live="polite"></p>
        </section>

        <section class="card">
          <h2>Nieuwe som</h2>
          <div class="form-row sum-row">
            <input id="sumA" type="number" inputmode="numeric" value="2" aria-label="Eerste getal" />
            <select id="sumOp" aria-label="Bewerking"><option value="+">+</option><option value="-">−</option></select>
            <input id="sumB" type="number" inputmode="numeric" value="3" aria-label="Tweede getal" />
            <button id="addSum" type="button">Toevoegen</button>
          </div>
          <p id="sumMsg" class="form-msg" role="status" aria-live="polite"></p>
        </section>

        <section class="card">
          <h2>Mijn inhoud</h2>
          <ul id="list" class="user-list"></ul>
          <div class="form-row">
            <button id="export" class="ghost" type="button">Exporteren</button>
            <button id="import" class="ghost" type="button">Importeren</button>
            <input id="file" type="file" accept="application/json,.json" hidden />
          </div>
          <p id="ioMsg" class="form-msg" role="status" aria-live="polite"></p>
        </section>
      </div>
    </main>
  `
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!

  const sound = $<HTMLInputElement>('#sound')
  sound.checked = !getSettings().muted
  sound.addEventListener('change', () => updateSettings({ muted: !sound.checked }))

  const themeGroup = $<HTMLDivElement>('#theme')
  const paintTheme = () => {
    const active = getSettings().theme
    for (const b of themeGroup.querySelectorAll<HTMLButtonElement>('button')) {
      b.classList.toggle('active', b.dataset.themeVal === active)
    }
  }
  themeGroup.addEventListener('click', (e) => {
    const val = (e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.themeVal as ThemeSetting | undefined
    if (!val) return
    updateSettings({ theme: val })
    applyTheme(val)
    paintTheme()
  })
  paintTheme()

  const wordInput = $<HTMLInputElement>('#word')
  const wordMsg = $('#wordMsg')

  // Emoji picker (the word's background illustration).
  const EMOJIS = ['🐱', '🐶', '🐵', '🐟', '🐰', '🐻', '🦋', '🌳', '🌙', '🌸', '🌹', '⭐', '🍎', '🚗', '🏠', '⚽', '🎈', '☀️']
  let selectedEmoji = ''
  const picker = $<HTMLDivElement>('#emojiPicker')
  function paintPicker() {
    for (const b of picker.querySelectorAll<HTMLButtonElement>('button')) {
      b.classList.toggle('active', (b.dataset.emoji ?? '') === selectedEmoji)
    }
  }
  {
    const none = document.createElement('button')
    none.type = 'button'
    none.dataset.emoji = ''
    none.textContent = '—'
    none.setAttribute('aria-label', 'Geen plaatje')
    picker.appendChild(none)
    for (const e of EMOJIS) {
      const b = document.createElement('button')
      b.type = 'button'
      b.dataset.emoji = e
      b.textContent = e
      picker.appendChild(b)
    }
  }
  picker.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button')
    if (!b) return
    selectedEmoji = b.dataset.emoji ?? ''
    paintPicker()
  })
  paintPicker()

  async function addWord() {
    const r = composeWord(wordInput.value, selectedEmoji)
    if (!r.ok) {
      wordMsg.textContent = r.error
      wordMsg.classList.remove('good')
      return
    }
    await content.save(r.item)
    wordMsg.textContent = `"${r.item.prompt}" toegevoegd`
    wordMsg.classList.add('good')
    wordInput.value = ''
    selectedEmoji = ''
    paintPicker()
  }
  $('#addWord').addEventListener('click', addWord)
  wordInput.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void addWord()
  })

  const sumA = $<HTMLInputElement>('#sumA')
  const sumB = $<HTMLInputElement>('#sumB')
  const sumOp = $<HTMLSelectElement>('#sumOp')
  const sumMsg = $('#sumMsg')
  $('#addSum').addEventListener('click', async () => {
    const r = composeSum(Number(sumA.value), sumOp.value === '-' ? '-' : '+', Number(sumB.value))
    if (!r.ok) {
      sumMsg.textContent = r.error
      sumMsg.classList.remove('good')
      return
    }
    await content.save(r.item)
    sumMsg.textContent = `"${r.item.prompt} ${r.item.answer}" toegevoegd`
    sumMsg.classList.add('good')
  })

  const listEl = $<HTMLUListElement>('#list')
  function renderList() {
    const items = content.userItems()
    listEl.innerHTML = ''
    if (items.length === 0) {
      const li = document.createElement('li')
      li.className = 'empty-row'
      li.textContent = 'Nog niets toegevoegd.'
      listEl.appendChild(li)
      return
    }
    for (const item of items) {
      const li = document.createElement('li')
      const label = document.createElement('button')
      label.className = 'link'
      label.type = 'button'
      const emoji = item.image?.kind === 'emoji' ? `${item.image.value} ` : ''
      label.textContent = item.type === 'sum' ? `${item.prompt} ${item.answer}` : `${emoji}${item.prompt}`
      label.addEventListener('click', () => prefill(item))
      const del = document.createElement('button')
      del.className = 'round small'
      del.type = 'button'
      del.setAttribute('aria-label', 'Verwijder')
      del.textContent = '✕'
      del.addEventListener('click', () => void content.remove(item.id))
      li.append(label, del)
      listEl.appendChild(li)
    }
  }

  // Tapping a saved item loads it back into the form for editing (saving with
  // the same text overwrites it, since the id is derived from the content).
  function prefill(item: ContentItem) {
    if (item.type === 'word') {
      wordInput.value = item.prompt
      selectedEmoji = item.image?.kind === 'emoji' ? item.image.value : ''
      paintPicker()
      wordInput.focus()
    } else if (item.type === 'sum' && item.sum) {
      sumA.value = String(item.sum.a)
      sumOp.value = item.sum.op
      sumB.value = String(item.sum.b)
    }
  }

  const ioMsg = $('#ioMsg')
  $('#export').addEventListener('click', async () => {
    const pack = await content.exportPack()
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'letter-tracer-inhoud.json'
    a.click()
    URL.revokeObjectURL(url)
    ioMsg.textContent = `${pack.items.length} geëxporteerd`
  })

  const file = $<HTMLInputElement>('#file')
  $('#import').addEventListener('click', () => file.click())
  file.addEventListener('change', async () => {
    const f = file.files?.[0]
    if (!f) return
    try {
      const { imported, warnings } = await content.importPack(JSON.parse(await f.text()))
      ioMsg.textContent = `${imported} geïmporteerd${warnings.length ? ` (${warnings.length} overgeslagen)` : ''}`
    } catch {
      ioMsg.textContent = 'Kon dit bestand niet lezen.'
    } finally {
      file.value = ''
    }
  })

  const unsub = content.subscribe(renderList)
  renderList()

  $('#back').addEventListener('click', opts.onBack)

  return {
    destroy() {
      unsub()
      root.innerHTML = ''
    },
  }
}
