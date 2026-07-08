// Theme resolution. The DOM themes itself via CSS tokens (light defaults +
// a dark palette under prefers-color-scheme / [data-theme]); this module (a)
// applies the manual override, (b) exposes the resolved *canvas* colours to the
// renderer by reading those same CSS tokens, and (c) notifies listeners when
// the theme changes so canvas surfaces can redraw. See Prompts/lt-02/03-dark-mode.md.

export type ThemeSetting = 'system' | 'light' | 'dark'

export interface CanvasColors {
  bg: string
  road: string
  guide: string
  current: string
  ink: string
  inkActive: string
  start: string
}

let cached: CanvasColors | null = null
const listeners = new Set<() => void>()

function read(): CanvasColors {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  return {
    bg: v('--bg'),
    road: v('--road'),
    guide: v('--guide'),
    current: v('--current'),
    ink: v('--trace-ink'),
    inkActive: v('--trace-ink-active'),
    start: v('--start'),
  }
}

/** Canvas colours for the current theme (cached; refreshed on theme change). */
export function canvasColors(): CanvasColors {
  return (cached ??= read())
}

function refresh(): void {
  cached = read()
  for (const fn of listeners) fn()
}

/** Subscribe to theme changes (to redraw canvas surfaces). Returns an unsub. */
export function onThemeChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function updateThemeColorMeta(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    if (bg) meta.content = bg
  }
}

/** Apply a theme setting: system clears the override; light/dark force it. */
export function applyTheme(setting: ThemeSetting): void {
  const root = document.documentElement
  if (setting === 'system') delete root.dataset.theme
  else root.dataset.theme = setting
  updateThemeColorMeta()
  refresh()
}

/** Apply the stored setting and keep the canvas in sync with OS changes. */
export function initTheme(getSetting: () => ThemeSetting): void {
  applyTheme(getSetting())
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getSetting() === 'system') {
      updateThemeColorMeta()
      refresh()
    }
  })
}
