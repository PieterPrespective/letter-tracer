// Loads and validates the bundled base content, and indexes it for lookup by
// character. The glyph library is the source glyphs used to compose words and
// sums later (M3). See Prompts/lt-01/02-data-model.md.

import baseContentJson from '../data/base-content.json'
import { parsePack } from './schema'
import type { ContentItem, ContentType, Glyph } from './types'

const parsed = parsePack(baseContentJson)

/** The validated base content pack. */
export const baseContent = parsed.pack
/** Warnings collected while validating the base pack (should be empty in CI). */
export const baseWarnings = parsed.warnings

const glyphByChar = new Map<string, Glyph>()
const itemByChar = new Map<string, ContentItem>()
for (const item of baseContent.items) {
  if (!itemByChar.has(item.prompt)) itemByChar.set(item.prompt, item)
  for (const g of item.glyphs) if (!glyphByChar.has(g.char)) glyphByChar.set(g.char, g)
}

/** The source glyph for a single character (used to compose words/sums). */
export function glyphForChar(char: string): Glyph | undefined {
  return glyphByChar.get(char)
}

/** The traceable exercise whose prompt is this character. */
export function itemForChar(char: string): ContentItem | undefined {
  return itemByChar.get(char)
}

/** All base items, optionally filtered by type. */
export function listItems(type?: ContentType): ContentItem[] {
  return type ? baseContent.items.filter((i) => i.type === type) : baseContent.items
}
