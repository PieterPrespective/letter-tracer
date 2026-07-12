// The "Overtrekken / Kiezen" practice-mode toggle shown on word/sum screens.
// Markup + wiring live here so the trace and choose screens share one control.
// See Prompts/lt-06/03-word-and-sum-choose-screens.md.

import type { PracticeMode } from '../../state/settings'

export function modeToggleHTML(active: PracticeMode): string {
  const btn = (mode: PracticeMode, label: string) =>
    `<button type="button" data-mode="${mode}" class="${active === mode ? 'active' : ''}" aria-pressed="${active === mode}">${label}</button>`
  return `<div class="mode-row"><div class="segmented mode-toggle" role="group" aria-label="Oefenwijze">${btn(
    'overtrekken',
    '✏️ Overtrekken',
  )}${btn('kiezen', '🔤 Kiezen')}</div></div>`
}

/** Wire clicks; `onSet` fires only when a *different* mode is chosen. */
export function wireModeToggle(root: ParentNode, current: PracticeMode, onSet: (m: PracticeMode) => void): void {
  const group = root.querySelector('.mode-toggle')
  group?.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]')
    const m = b?.dataset.mode as PracticeMode | undefined
    if (m && m !== current) onSet(m)
  })
}
