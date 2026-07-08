// Runtime validation + migration for content packs. Accepts the current shape
// and the legacy stroke form (bare Point[][]), drops invalid items with
// collected warnings, and hard-fails only on an unknown future schemaVersion.
// See Prompts/lt-01/02-data-model.md. Unit-tested in schema.test.ts.

import { GLYPH_SIZE } from '../config'
import type { ContentItem, ContentPack, ContentType, Glyph, Stroke } from './types'

export const SCHEMA_VERSION = 1

const CONTENT_TYPES: ContentType[] = ['letter', 'number', 'word', 'sum']

export interface ParseResult {
  pack: ContentPack
  warnings: string[]
}

/** Thrown when a pack cannot be parsed at all (not merely a bad item). */
export class SchemaError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function inBox(n: number): boolean {
  return n >= 0 && n <= GLYPH_SIZE
}

/** Accepts { x, y } within the glyph box. */
function normalizePoint(raw: unknown): { x: number; y: number } | null {
  if (!isRecord(raw)) return null
  const { x, y } = raw
  if (!isNumber(x) || !isNumber(y) || !inBox(x) || !inBox(y)) return null
  return { x, y }
}

/** Accepts a legacy Point[] or the current { points, tolerance?, hint? }. */
function normalizeStroke(raw: unknown): Stroke | null {
  const rawPoints = Array.isArray(raw) ? raw : isRecord(raw) ? raw.points : undefined
  if (!Array.isArray(rawPoints) || rawPoints.length < 2) return null
  const points = rawPoints.map(normalizePoint)
  if (points.some((p) => p === null)) return null
  const stroke: Stroke = { points: points as { x: number; y: number }[] }
  if (isRecord(raw)) {
    if (isNumber(raw.tolerance)) stroke.tolerance = raw.tolerance
    if (typeof raw.hint === 'string') stroke.hint = raw.hint
  }
  return stroke
}

function normalizeGlyph(raw: unknown): Glyph | null {
  if (!isRecord(raw) || typeof raw.char !== 'string' || !Array.isArray(raw.strokes)) return null
  if (raw.strokes.length === 0) return null
  const strokes = raw.strokes.map(normalizeStroke)
  if (strokes.some((s) => s === null)) return null
  const glyph: Glyph = { char: raw.char, strokes: strokes as Stroke[] }
  if (isRecord(raw.metrics)) {
    const m = raw.metrics
    if (isNumber(m.baseline) && isNumber(m.xHeight) && isNumber(m.capHeight)) {
      glyph.metrics = { baseline: m.baseline, xHeight: m.xHeight, capHeight: m.capHeight }
    }
  }
  return glyph
}

function normalizeItem(raw: unknown): ContentItem | string {
  if (!isRecord(raw)) return 'item is not an object'
  const { id, type, prompt, answer } = raw
  if (typeof id !== 'string' || id.length === 0) return 'item has no id'
  if (typeof type !== 'string' || !CONTENT_TYPES.includes(type as ContentType))
    return `item ${String(id)} has invalid type ${String(type)}`
  if (!Array.isArray(raw.glyphs) || raw.glyphs.length === 0)
    return `item ${id} has no glyphs`
  const glyphs = raw.glyphs.map(normalizeGlyph)
  if (glyphs.some((g) => g === null)) return `item ${id} has an invalid glyph`

  const item: ContentItem = {
    id,
    type: type as ContentType,
    glyphs: glyphs as Glyph[],
    prompt: typeof prompt === 'string' ? prompt : id,
    answer: typeof answer === 'string' ? answer : '',
    source: raw.source === 'user' ? 'user' : 'base',
  }
  if (Array.isArray(raw.tags)) item.tags = raw.tags.filter((t): t is string => typeof t === 'string')

  if (isRecord(raw.image) && typeof raw.image.value === 'string' && raw.image.value) {
    if (raw.image.kind === 'emoji' || raw.image.kind === 'dataurl') {
      item.image = { kind: raw.image.kind, value: raw.image.value }
    }
  }

  if (type === 'sum') {
    const s = raw.sum
    if (!isRecord(s) || !isNumber(s.a) || !isNumber(s.b) || !isNumber(s.result) || (s.op !== '+' && s.op !== '-'))
      return `sum ${id} has an invalid descriptor`
    const expected = s.op === '+' ? s.a + s.b : s.a - s.b
    if (expected !== s.result) return `sum ${id} result ${s.result} != ${s.a} ${s.op} ${s.b}`
    item.sum = { a: s.a, op: s.op, b: s.b, result: s.result }
  }
  return item
}

/**
 * Parse and validate a content pack. Invalid items are dropped with a warning;
 * a duplicate id keeps the first occurrence. Throws SchemaError only for a
 * missing/too-new schemaVersion.
 */
export function parsePack(input: unknown): ParseResult {
  if (!isRecord(input)) throw new SchemaError('pack is not an object')
  const version = input.schemaVersion
  if (!isNumber(version)) throw new SchemaError('pack has no schemaVersion')
  if (version > SCHEMA_VERSION) throw new SchemaError(`unsupported schemaVersion ${version}`)
  if (!Array.isArray(input.items)) throw new SchemaError('pack has no items array')

  const warnings: string[] = []
  const seen = new Set<string>()
  const items: ContentItem[] = []
  for (const raw of input.items) {
    const result = normalizeItem(raw)
    if (typeof result === 'string') {
      warnings.push(result)
      continue
    }
    if (seen.has(result.id)) {
      warnings.push(`duplicate id ${result.id} dropped`)
      continue
    }
    seen.add(result.id)
    items.push(result)
  }

  return {
    pack: {
      schemaVersion: SCHEMA_VERSION,
      name: typeof input.name === 'string' ? input.name : 'Untitled',
      locale: typeof input.locale === 'string' ? input.locale : 'nl-NL',
      items,
    },
    warnings,
  }
}
