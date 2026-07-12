// App shell: owns the root element and switches between screens, tearing down
// the previous one so nothing leaks. Screens are plain factories returning a
// destroy handle.

import { createHomeScreen } from './ui/screens/home'
import { createTraceScreen } from './ui/screens/trace'
import { createChooseScreen } from './ui/screens/choose'
import { createEditorScreen } from './ui/screens/editor'
import { content } from './model/content'
import { itemForChar } from './model/glyph-library'
import { canChoose } from './model/select-game'
import { getSettings, updateSettings, type PracticeMode } from './state/settings'
import type { ContentItem } from './model/types'

interface Screen {
  destroy: () => void
}

export class App {
  private current: Screen | null = null
  private debug: boolean

  constructor(private root: HTMLElement) {
    this.debug = new URLSearchParams(location.search).has('debug')
  }

  async start(): Promise<void> {
    await content.init()
    // Deep-link: ?char= opens that glyph directly (handy for review/testing);
    // add &mode=kiezen to open the choose game for a word/sum.
    const params = new URLSearchParams(location.search)
    // ?char=a opens a single glyph; ?item=word-boom opens any item by id.
    const item = params.get('item')
      ? content.get(params.get('item')!)
      : params.get('char')
        ? itemForChar(params.get('char')!)
        : undefined
    if (item) this.showPractice([item], 0, params.get('mode') === 'kiezen' ? 'kiezen' : 'overtrekken')
    else this.showHome()
  }

  private mount(factory: (root: HTMLElement) => Screen): void {
    this.current?.destroy()
    this.current = factory(this.root)
  }

  private showHome(): void {
    this.mount((root) =>
      createHomeScreen(root, {
        onSelect: (items, i) => this.showPractice(items, i, getSettings().mode),
        onEditor: () => this.showEditor(),
      }),
    )
  }

  /**
   * Practise a word/sum by tracing ("overtrekken") or by choosing the letters/
   * numbers ("kiezen"). Letters and numbers always trace. The mode toggle lets
   * a child switch how they practise the same item.
   */
  private showPractice(items: ContentItem[], index: number, mode: PracticeMode): void {
    const effective: PracticeMode = mode === 'kiezen' && canChoose(items[index]) ? 'kiezen' : 'overtrekken'
    const common = {
      items,
      index,
      onBack: () => this.showHome(),
      onNavigate: (i: number) => this.showPractice(items, i, mode),
      onSetMode: (m: PracticeMode) => {
        updateSettings({ mode: m })
        this.showPractice(items, index, m)
      },
    }
    this.mount((root) =>
      effective === 'kiezen'
        ? createChooseScreen(root, common)
        : createTraceScreen(root, { ...common, debug: this.debug }),
    )
  }

  private showEditor(): void {
    this.mount((root) => createEditorScreen(root, { onBack: () => this.showHome() }))
  }
}
