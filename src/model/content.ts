// In-memory registry that merges shipped base content with the parent's saved
// content, and notifies subscribers on change. Screens read from here rather
// than the raw glyph library so user additions show up everywhere.
// See Prompts/lt-01/06-storage-and-content-editor.md.

import { baseContent } from './glyph-library'
import {
  deleteUserItem,
  exportPack as repoExport,
  importPack as repoImport,
  loadUserContent,
  saveUserItem,
} from '../storage/content-repo'
import type { ContentItem, ContentPack, ContentType } from './types'

type Listener = () => void

class ContentRegistry {
  private user = new Map<string, ContentItem>()
  private listeners = new Set<Listener>()
  private persistRequested = false

  /** Load saved user content. Safe to call once at startup. */
  async init(): Promise<void> {
    try {
      for (const item of await loadUserContent()) this.user.set(item.id, item)
    } catch {
      /* storage unavailable — run with base content only */
    }
    this.emit()
  }

  /** Base + user items (user shadows a base item with the same id). */
  list(type?: ContentType): ContentItem[] {
    const byId = new Map<string, ContentItem>()
    for (const item of baseContent.items) byId.set(item.id, item)
    for (const item of this.user.values()) byId.set(item.id, item)
    const all = [...byId.values()]
    return type ? all.filter((i) => i.type === type) : all
  }

  get(id: string): ContentItem | undefined {
    return this.user.get(id) ?? baseContent.items.find((i) => i.id === id)
  }

  /** User items only (for the editor's "my content" list). */
  userItems(): ContentItem[] {
    return [...this.user.values()]
  }

  async save(item: ContentItem): Promise<void> {
    await this.requestPersist()
    await saveUserItem(item)
    this.user.set(item.id, item)
    this.emit()
  }

  async remove(id: string): Promise<void> {
    await deleteUserItem(id)
    this.user.delete(id)
    this.emit()
  }

  exportPack(): Promise<ContentPack> {
    return repoExport()
  }

  async importPack(input: unknown): Promise<{ imported: number; warnings: string[] }> {
    const result = await repoImport(input)
    for (const item of await loadUserContent()) this.user.set(item.id, item)
    this.emit()
    return result
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    for (const fn of this.listeners) fn()
  }

  // Ask the browser to keep our storage from being evicted, on first save.
  private async requestPersist(): Promise<void> {
    if (this.persistRequested) return
    this.persistRequested = true
    try {
      await navigator.storage?.persist?.()
    } catch {
      /* best effort */
    }
  }
}

export const content = new ContentRegistry()
