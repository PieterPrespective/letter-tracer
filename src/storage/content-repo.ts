// CRUD for user-authored content, plus import/export of content packs.
// See Prompts/lt-01/06-storage-and-content-editor.md.

import { SCHEMA_VERSION, parsePack } from '../model/schema'
import { USER_CONTENT, del, getAll, hasIndexedDB, put } from './db'
import type { ContentItem, ContentPack } from '../model/types'

export async function loadUserContent(): Promise<ContentItem[]> {
  if (!hasIndexedDB()) return []
  const items = await getAll<ContentItem>(USER_CONTENT)
  return items.map((i) => ({ ...i, source: 'user' }))
}

export async function saveUserItem(item: ContentItem): Promise<void> {
  if (!hasIndexedDB()) return
  await put(USER_CONTENT, { ...item, source: 'user' })
}

export async function deleteUserItem(id: string): Promise<void> {
  if (!hasIndexedDB()) return
  await del(USER_CONTENT, id)
}

/** Gather all user content into a portable pack (for download / backup). */
export async function exportPack(name = 'Mijn inhoud'): Promise<ContentPack> {
  return { schemaVersion: SCHEMA_VERSION, name, locale: 'nl-NL', items: await loadUserContent() }
}

/**
 * Validate and import a pack, upserting its items as user content. Returns how
 * many items were imported and any per-item warnings from validation.
 */
export async function importPack(input: unknown): Promise<{ imported: number; warnings: string[] }> {
  const { pack, warnings } = parsePack(input)
  for (const item of pack.items) await saveUserItem(item)
  return { imported: pack.items.length, warnings }
}
