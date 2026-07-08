import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteUserItem, exportPack, importPack, loadUserContent, saveUserItem } from './content-repo'
import { USER_CONTENT, clear } from './db'
import type { ContentItem } from '../model/types'

const word = (id: string, prompt: string): ContentItem => ({
  id,
  type: 'word',
  glyphs: [{ char: 'a', strokes: [{ points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }] }],
  prompt,
  answer: prompt,
  tags: ['woord', 'eigen'],
  source: 'user',
})

describe('content-repo (IndexedDB)', () => {
  beforeEach(async () => {
    await clear(USER_CONTENT)
  })

  it('saves, loads, and deletes user items', async () => {
    await saveUserItem(word('word-kat', 'kat'))
    await saveUserItem(word('word-vis', 'vis'))
    let items = await loadUserContent()
    expect(items.map((i) => i.id).sort()).toEqual(['word-kat', 'word-vis'])
    expect(items.every((i) => i.source === 'user')).toBe(true)

    await deleteUserItem('word-kat')
    items = await loadUserContent()
    expect(items.map((i) => i.id)).toEqual(['word-vis'])
  })

  it('upserts on the same id', async () => {
    await saveUserItem(word('word-kat', 'kat'))
    await saveUserItem(word('word-kat', 'KAT'))
    const items = await loadUserContent()
    expect(items).toHaveLength(1)
    expect(items[0].prompt).toBe('KAT')
  })

  it('round-trips through export and import', async () => {
    await saveUserItem(word('word-kat', 'kat'))
    await saveUserItem(word('word-vis', 'vis'))
    const pack = await exportPack()
    expect(pack.items).toHaveLength(2)

    // Wipe and re-import.
    await deleteUserItem('word-kat')
    await deleteUserItem('word-vis')
    expect(await loadUserContent()).toHaveLength(0)

    const { imported } = await importPack(pack)
    expect(imported).toBe(2)
    expect((await loadUserContent()).map((i) => i.id).sort()).toEqual(['word-kat', 'word-vis'])
  })
})
