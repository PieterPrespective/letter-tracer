// App shell: owns the root element and switches between screens, tearing down
// the previous one so nothing leaks. Screens are plain factories returning a
// destroy handle.

import { createHomeScreen } from './ui/screens/home'
import { createTraceScreen } from './ui/screens/trace'
import { itemForChar } from './model/glyph-library'
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

  start(): void {
    // Deep-link: ?char= opens that glyph directly (handy for review/testing).
    const requested = new URLSearchParams(location.search).get('char')
    const item = requested ? itemForChar(requested) : undefined
    if (item) this.showTrace([item], 0)
    else this.showHome()
  }

  private mount(factory: (root: HTMLElement) => Screen): void {
    this.current?.destroy()
    this.current = factory(this.root)
  }

  private showHome(): void {
    this.mount((root) => createHomeScreen(root, { onSelect: (items, i) => this.showTrace(items, i) }))
  }

  private showTrace(items: ContentItem[], index: number): void {
    this.mount((root) =>
      createTraceScreen(root, {
        items,
        index,
        debug: this.debug,
        onBack: () => this.showHome(),
        onNavigate: (i) => this.showTrace(items, i),
      }),
    )
  }
}
