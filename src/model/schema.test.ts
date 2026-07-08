import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, SchemaError, parsePack } from './schema'

const validItem = {
  id: 'letter-a',
  type: 'letter',
  prompt: 'a',
  answer: 'a',
  glyphs: [
    {
      char: 'a',
      strokes: [{ points: [{ x: 100, y: 100 }, { x: 200, y: 200 }] }],
    },
  ],
}

function pack(items: unknown[]) {
  return { schemaVersion: 1, name: 'Test', locale: 'nl-NL', items }
}

describe('parsePack', () => {
  it('parses a valid pack', () => {
    const { pack: p, warnings } = parsePack(pack([validItem]))
    expect(warnings).toEqual([])
    expect(p.items).toHaveLength(1)
    expect(p.items[0].id).toBe('letter-a')
    expect(p.items[0].source).toBe('base')
  })

  it('migrates the legacy stroke form (bare Point[][])', () => {
    const legacy = {
      ...validItem,
      glyphs: [{ char: 'a', strokes: [[{ x: 0, y: 0 }, { x: 10, y: 10 }]] }],
    }
    const { pack: p } = parsePack(pack([legacy]))
    expect(p.items[0].glyphs[0].strokes[0].points).toHaveLength(2)
  })

  it('drops invalid items with a warning instead of failing the whole pack', () => {
    const bad = { ...validItem, id: 'bad', glyphs: [{ char: 'x', strokes: [] }] }
    const { pack: p, warnings } = parsePack(pack([bad, validItem]))
    expect(p.items).toHaveLength(1)
    expect(p.items[0].id).toBe('letter-a')
    expect(warnings.length).toBe(1)
  })

  it('rejects out-of-box coordinates', () => {
    const oob = {
      ...validItem,
      id: 'oob',
      glyphs: [{ char: 'a', strokes: [{ points: [{ x: -1, y: 0 }, { x: 10, y: 10 }] }] }],
    }
    const { pack: p, warnings } = parsePack(pack([oob]))
    expect(p.items).toHaveLength(0)
    expect(warnings).toHaveLength(1)
  })

  it('validates sum consistency', () => {
    const goodSum = {
      id: 'sum-ok',
      type: 'sum',
      prompt: '2 + 3',
      answer: '5',
      sum: { a: 2, op: '+', b: 3, result: 5 },
      glyphs: [{ char: '5', strokes: [{ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }] }],
    }
    const badSum = { ...goodSum, id: 'sum-bad', sum: { a: 2, op: '+', b: 3, result: 6 } }
    const { pack: p, warnings } = parsePack(pack([goodSum, badSum]))
    expect(p.items.map((i) => i.id)).toEqual(['sum-ok'])
    expect(warnings).toHaveLength(1)
  })

  it('drops duplicate ids, keeping the first', () => {
    const { pack: p, warnings } = parsePack(pack([validItem, validItem]))
    expect(p.items).toHaveLength(1)
    expect(warnings).toHaveLength(1)
  })

  it('normalises schemaVersion to the current version', () => {
    const { pack: p } = parsePack(pack([validItem]))
    expect(p.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('throws on a missing or too-new schemaVersion', () => {
    expect(() => parsePack({ name: 'x', items: [] })).toThrow(SchemaError)
    expect(() => parsePack({ schemaVersion: 999, items: [] })).toThrow(SchemaError)
  })
})
