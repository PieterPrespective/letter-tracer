// Dev-only glyph generator. Authors the base blokletter set directly from
// stroke primitives (lines + arcs) in the 0..1000 glyph box (y-down), with
// each stroke's point order encoding schrijfrichting and the stroke order
// encoding writing order. Emits src/data/base-content.json.
//
// Run: npm run build:glyphs
//
// This replaces the "fetch Hershey, then hand-annotate direction/order" step
// from Prompts/lt-01/03-stroke-data-and-pedagogy.md — authoring directly gives
// pedagogically-correct direction/order by construction. Shapes still need a
// Dutch teacher's review; track that in Prompts/lt-01/GLYPH-REVIEW.md.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join as joinPath } from 'node:path'

type P = { x: number; y: number }
type Stroke = { points: P[]; hint?: string }
type Metrics = { baseline: number; xHeight: number; capHeight: number }
type Glyph = { char: string; strokes: Stroke[]; metrics?: Metrics }

// Vertical metrics (y-down).
const CAP = 150 // cap / ascender top
const XT = 380 // x-height top
const BASE = 780 // baseline
const DESC = 950 // descender bottom
const RAD = Math.PI / 180

/** Sample an elliptical arc from a0 to a1 degrees (0=east, +=clockwise on screen). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps = 20): P[] {
  const out: P[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps) * RAD
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) })
  }
  return out
}

/** A polyline stroke from [x,y] pairs. */
function seg(coords: [number, number][], hint?: string): Stroke {
  return { points: coords.map(([x, y]) => ({ x, y })), hint }
}

/** A stroke built from concatenated point runs (arcs/lines), de-duplicating joins. */
function join(runs: P[][], hint?: string): Stroke {
  const points: P[] = []
  for (const run of runs) {
    for (const p of run) {
      const last = points[points.length - 1]
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.5) points.push(p)
    }
  }
  return { points, hint }
}

const G = (char: string, strokes: Stroke[]): Glyph => ({ char, strokes })

// ---------------------------------------------------------------------------
// Digits
// ---------------------------------------------------------------------------
const digits: Glyph[] = [
  G('0', [join([arc(500, (CAP + BASE) / 2, 175, (BASE - CAP) / 2, -90, -450, 40)], 'Begin bovenaan, ga naar links rond')]),
  G('1', [seg([[360, 280], [500, 150], [500, BASE]]), seg([[380, BASE], [620, BASE]])]),
  G('2', [
    join([arc(500, 340, 180, 180, -175, 55, 22), [{ x: 330, y: BASE }], [{ x: 680, y: BASE }]], 'Boog, schuin omlaag, streep'),
  ]),
  G('3', [
    join([arc(470, 300, 170, 150, -185, 90, 20), arc(470, 590, 180, 160, -90, 150, 20)], 'Twee bochten naar rechts'),
  ]),
  G('4', [seg([[560, 150], [300, 610], [660, 610]]), seg([[520, 320], [520, BASE]])]),
  G('5', [
    join([[{ x: 610, y: 180 }, { x: 360, y: 180 }, { x: 360, y: 450 }], arc(490, 600, 205, 175, -145, 130, 24)], 'Streep, omlaag, dan de buik'),
  ]),
  G('6', [
    join(
      [arc(500, 500, 185, 350, -60, -180, 18), arc(505, 600, 180, 180, 180, -180, 30)],
      'In één keer: haak omlaag en rond',
    ),
  ]),
  G('7', [seg([[320, 180], [680, 180], [430, BASE]])]),
  G('8', [
    join([arc(490, 335, 135, 135, -90, -450, 24)], 'Rondje boven, linksom'),
    join([arc(490, 610, 140, 140, -90, -450, 26)], 'Rondje onder, linksom'),
  ]),
  G('9', [
    join([arc(500, 355, 170, 185, -90, -450, 32)], 'Eerst het rondje, linksom'),
    seg([[665, 355], [620, BASE]], 'Dan de staart naar beneden'),
  ]),
]

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------
const operators: Glyph[] = [
  G('+', [seg([[500, 300], [500, 660]]), seg([[320, 480], [680, 480]])]),
  G('-', [seg([[320, 500], [680, 500]])]),
  G('=', [seg([[320, 420], [680, 420]]), seg([[320, 580], [680, 580]])]),
]

// ---------------------------------------------------------------------------
// Uppercase
// ---------------------------------------------------------------------------
const upper: Glyph[] = [
  G('A', [seg([[500, CAP], [300, BASE]], 'Van de punt schuin omlaag'), seg([[500, CAP], [700, BASE]], 'En de andere kant'), seg([[370, 560], [630, 560]], 'Streepje in het midden')]),
  G('B', [
    seg([[330, CAP], [330, BASE]], 'Van boven naar beneden'),
    join([[{ x: 330, y: CAP }], arc(330, 315, 190, 165, -90, 90, 16)]),
    join([[{ x: 330, y: 470 }], arc(330, 620, 205, 175, -90, 90, 16)]),
  ]),
  G('C', [join([arc(520, (CAP + BASE) / 2, 210, (BASE - CAP) / 2, -50, -310, 30)], 'Open kant naar rechts')]),
  G('D', [seg([[330, CAP], [330, BASE]]), join([[{ x: 330, y: CAP }], arc(330, (CAP + BASE) / 2, 230, (BASE - CAP) / 2, -90, 90, 22)])]),
  G('E', [seg([[350, CAP], [350, BASE]]), seg([[350, CAP], [670, CAP]]), seg([[350, 465], [620, 465]]), seg([[350, BASE], [670, BASE]])]),
  G('F', [seg([[350, CAP], [350, BASE]]), seg([[350, CAP], [670, CAP]]), seg([[350, 465], [620, 465]])]),
  G('G', [join([arc(520, (CAP + BASE) / 2, 210, (BASE - CAP) / 2, -50, -320, 30), [{ x: 520, y: 500 }, { x: 700, y: 500 }]])]),
  G('H', [seg([[320, CAP], [320, BASE]]), seg([[680, CAP], [680, BASE]]), seg([[320, 465], [680, 465]])]),
  G('I', [seg([[500, CAP], [500, BASE]])]),
  G('J', [join([[{ x: 620, y: CAP }, { x: 620, y: 640 }], arc(470, 640, 150, 150, 0, 180, 12)])]),
  G('K', [seg([[330, CAP], [330, BASE]]), seg([[680, CAP], [330, 470]]), seg([[420, 470], [690, BASE]])]),
  G('L', [seg([[350, CAP], [350, BASE]]), seg([[350, BASE], [670, BASE]])]),
  G('M', [seg([[280, BASE], [280, CAP]]), seg([[280, CAP], [500, 540]]), seg([[500, 540], [720, CAP]]), seg([[720, CAP], [720, BASE]])]),
  G('N', [seg([[300, BASE], [300, CAP]]), seg([[300, CAP], [700, BASE]]), seg([[700, BASE], [700, CAP]])]),
  G('O', [join([arc(500, (CAP + BASE) / 2, 215, (BASE - CAP) / 2, -90, -450, 40)], 'Begin bovenaan, ga rond')]),
  G('P', [seg([[340, CAP], [340, BASE]]), join([[{ x: 340, y: CAP }], arc(340, 320, 200, 170, -90, 90, 18)])]),
  G('Q', [join([arc(500, (CAP + BASE) / 2, 210, (BASE - CAP) / 2, -90, -450, 40)]), seg([[560, 620], [720, BASE]])]),
  G('R', [seg([[340, CAP], [340, BASE]]), join([[{ x: 340, y: CAP }], arc(340, 320, 200, 170, -90, 90, 18)]), seg([[430, 470], [700, BASE]])]),
  G('S', [seg([[600, 250], [560, 190], [480, 168], [400, 185], [355, 250], [370, 320], [450, 370], [540, 415], [620, 470], [655, 550], [635, 645], [560, 710], [460, 730], [370, 710], [330, 650]], 'Als een slang')]),
  G('T', [seg([[300, CAP], [700, CAP]]), seg([[500, CAP], [500, BASE]])]),
  G('U', [join([[{ x: 320, y: CAP }, { x: 320, y: 600 }], arc(500, 600, 180, 185, 180, 0, 22), [{ x: 680, y: 600 }, { x: 680, y: CAP }]])]),
  G('V', [seg([[300, CAP], [500, BASE]]), seg([[500, BASE], [700, CAP]])]),
  G('W', [seg([[250, CAP], [390, BASE]]), seg([[390, BASE], [500, 380]]), seg([[500, 380], [610, BASE]]), seg([[610, BASE], [750, CAP]])]),
  G('X', [seg([[320, CAP], [680, BASE]]), seg([[680, CAP], [320, BASE]])]),
  G('Y', [seg([[320, CAP], [500, 480]]), seg([[680, CAP], [500, 480]]), seg([[500, 480], [500, BASE]])]),
  G('Z', [seg([[320, CAP], [680, CAP]]), seg([[680, CAP], [320, BASE]]), seg([[320, BASE], [680, BASE]])]),
]

// ---------------------------------------------------------------------------
// Lowercase
// ---------------------------------------------------------------------------
const xMid = (XT + BASE) / 2
const lower: Glyph[] = [
  G('a', [
    join([arc(500, xMid, 170, 200, -90, -450, 32)], 'Eerst het rondje, linksom'),
    seg([[670, XT], [670, BASE]], 'Dan de stok naar beneden'),
  ]),
  G('b', [seg([[330, CAP], [330, BASE]], 'Eerst de stok'), join([arc(330, xMid, 200, (BASE - XT) / 2, -90, 90, 26)], 'Boog naar rechts')]),
  G('c', [join([arc(510, xMid, 190, (BASE - XT) / 2, -55, -305, 26)], 'Open kant naar rechts')]),
  G('d', [
    join([arc(500, xMid, 170, 200, -90, -450, 32)], 'Eerst het rondje, linksom'),
    seg([[670, CAP], [670, BASE]], 'Dan de hoge stok naar beneden'),
  ]),
  G('e', [join([[{ x: 340, y: xMid + 10 }, { x: 660, y: xMid + 10 }], arc(500, xMid, 185, (BASE - XT) / 2, -20, -290, 28)], 'Streepje, dan rond')]),
  G('f', [join([arc(560, 330, 150, 150, -30, -180, 14), [{ x: 410, y: 330 }, { x: 410, y: BASE }]]), seg([[300, 470], [560, 470]])]),
  G('g', [
    join([arc(500, xMid, 170, 200, -90, -450, 32)], 'Eerst het rondje, linksom'),
    join([[{ x: 670, y: XT }, { x: 670, y: 850 }], arc(540, 850, 130, 110, 0, 150, 12)], 'Staart omlaag, haakje naar links'),
  ]),
  G('h', [seg([[330, CAP], [330, BASE]]), join([[{ x: 330, y: 500 }], arc(490, 500, 165, 150, 180, 360, 16), [{ x: 655, y: BASE }]], 'Boogje omhoog en naar beneden')]),
  G('i', [seg([[500, XT], [500, BASE]]), seg([[500, 250], [500, 258]], 'De stip')]),
  G('j', [join([[{ x: 560, y: XT }, { x: 560, y: 850 }], arc(430, 850, 130, 130, 0, 160, 12)]), seg([[560, 250], [560, 258]], 'De stip')]),
  G('k', [seg([[340, CAP], [340, BASE]]), seg([[620, XT], [340, 590]]), seg([[430, 590], [640, BASE]])]),
  G('l', [seg([[500, CAP], [500, BASE]])]),
  G('m', [
    seg([[300, XT], [300, BASE]]),
    join([[{ x: 300, y: 500 }], arc(410, 500, 110, 120, 180, 360, 14), [{ x: 520, y: BASE }]]),
    join([[{ x: 520, y: 500 }], arc(630, 500, 110, 120, 180, 360, 14), [{ x: 740, y: BASE }]]),
  ]),
  G('n', [seg([[330, XT], [330, BASE]]), join([[{ x: 330, y: 500 }], arc(490, 500, 165, 150, 180, 360, 16), [{ x: 655, y: BASE }]])]),
  G('o', [join([arc(500, xMid, 175, (BASE - XT) / 2, -90, -450, 32)], 'Begin bovenaan, ga rond')]),
  G('p', [seg([[330, XT], [330, DESC]], 'Stok naar beneden'), join([arc(330, xMid, 200, (BASE - XT) / 2, -90, 90, 26)], 'Boog naar rechts')]),
  G('q', [
    join([arc(500, xMid, 170, 200, -90, -450, 32)], 'Eerst het rondje, linksom'),
    join([[{ x: 670, y: XT }, { x: 670, y: 860 }], arc(715, 860, 45, 50, 180, 30, 10)], 'Staart met haakje naar rechts'),
  ]),
  G('r', [seg([[350, XT], [350, BASE]]), join([[{ x: 350, y: 470 }], arc(500, 480, 160, 130, 200, 320, 12)])]),
  G('s', [seg([[585, 455], [545, 415], [475, 400], [410, 425], [388, 480], [410, 535], [485, 568], [560, 600], [600, 655], [575, 710], [500, 735], [425, 720], [388, 675]], 'Als een slang')]),
  G('t', [seg([[470, 290], [470, BASE]], 'Stok recht naar beneden'), seg([[320, 395], [610, 395]], 'Streepje erover')]),
  G('u', [join([[{ x: 330, y: XT }, { x: 330, y: 620 }], arc(500, 620, 170, 160, 180, 0, 20), [{ x: 670, y: 620 }, { x: 670, y: XT }]])]),
  G('v', [seg([[330, XT], [500, BASE]]), seg([[500, BASE], [670, XT]])]),
  G('w', [seg([[280, XT], [400, BASE]]), seg([[400, BASE], [500, 520]]), seg([[500, 520], [600, BASE]]), seg([[600, BASE], [720, XT]])]),
  G('x', [seg([[340, XT], [660, BASE]]), seg([[660, XT], [340, BASE]])]),
  G('y', [seg([[330, XT], [500, 700]], 'Schuin omlaag naar het midden'), seg([[670, XT], [380, DESC]], 'Schuin door tot in de staart')]),
  G('z', [seg([[340, XT], [660, XT]]), seg([[660, XT], [340, BASE]]), seg([[340, BASE], [660, BASE]])]),
]

// ---------------------------------------------------------------------------
// Assemble the pack
// ---------------------------------------------------------------------------
type ContentItem = {
  id: string
  type: 'letter' | 'number' | 'word' | 'sum'
  glyphs: Glyph[]
  prompt: string
  answer: string
  tags: string[]
  source: 'base'
  sum?: { a: number; op: '+' | '-'; b: number; result: number }
  image?: { kind: 'emoji' | 'dataurl'; value: string }
}

const OP_NAMES: Record<string, string> = { '+': 'plus', '-': 'minus', '=': 'equals' }

function itemFor(g: Glyph): ContentItem {
  const isDigit = g.char >= '0' && g.char <= '9'
  const isLetter = /[a-z]/i.test(g.char)
  const kind = g.char === g.char.toLowerCase() ? 'lower' : 'upper'
  const id = isLetter
    ? `letter-${g.char.toLowerCase()}-${kind}`
    : isDigit
      ? `number-${g.char}`
      : `op-${OP_NAMES[g.char] ?? g.char}`
  const tags = isLetter ? [kind === 'lower' ? 'kleine-letter' : 'hoofdletter'] : isDigit ? ['cijfer'] : ['teken']
  const metrics: Metrics = { baseline: BASE, xHeight: XT, capHeight: CAP }
  return {
    id,
    type: isLetter ? 'letter' : 'number',
    glyphs: [{ ...g, metrics }],
    prompt: g.char,
    answer: g.char,
    tags,
    source: 'base',
  }
}

const all = [...lower, ...upper, ...digits, ...operators]

// --- Words & sums, composed from the single-glyph library --------------------
const glyphByChar = new Map<string, Glyph>()
for (const g of all) glyphByChar.set(g.char, g)
const METRICS: Metrics = { baseline: BASE, xHeight: XT, capHeight: CAP }

function glyphFor(ch: string): Glyph {
  const g = glyphByChar.get(ch)
  if (!g) throw new Error(`no base glyph for '${ch}'`)
  return { char: g.char, strokes: g.strokes, metrics: METRICS }
}

// Dutch starter words (Veilig Leren Lezen / kim-versie ordering), each with a
// picture. Letters that the method writes as one klank (ui, aa, oe, …) are just
// individual glyphs here — `[...'muis']` → m,u,i,s. Words with no clean emoji
// in the source list are omitted. See the uploaded startwoorden list.
const WORD_EMOJI: Record<string, string> = {
  // kern start (i, k, m, s)
  ik: '🙋', kim: '👧', mis: '❌', sim: '📱',
  // kern 1 (p, aa, r, e, v)
  vis: '🐟', aap: '🐵', rem: '🛑', kip: '🐔', kaas: '🧀', mes: '🔪', sip: '😞', vaas: '🏺', raak: '🎯',
  // kern 2 (n, t, ee, b, oo)
  maan: '🌙', pet: '🧢', boot: '⛵', been: '🦵', roos: '🌹', pen: '🖊️', teen: '🦶', boom: '🌳', net: '🥅',
  peer: '🍐', noot: '🥜', beer: '🐻', poot: '🐾', mees: '🐦', boon: '🫘', veer: '🪶', meet: '📏',
  // kern 3 (d, oe, z, ij, h)
  zee: '🌊', doos: '📦', ijs: '🍦', koe: '🐄', haar: '💇', zes: '6️⃣', hoed: '👒', voet: '🦶', heet: '🥵',
  zeep: '🧼', boek: '📖', hijs: '🏗️', hoek: '📐', zit: '🪑',
  // kern 4 (w, o, a, u, j)
  zon: '☀️', jas: '🧥', bus: '🚌', kat: '🐱', sok: '🧦', mus: '🐦', bal: '⚽', vos: '🦊', man: '👨', bot: '🦴',
  web: '🕸️', pan: '🍳', wol: '🧶', nat: '💦', bos: '🌲', zak: '👝', dak: '🏠', tak: '🌿',
  // kern 5 (eu, ie, l, ou, uu)
  vuur: '🔥', ziek: '🤒', deur: '🚪', hout: '🪵', lip: '👄', neus: '👃', muur: '🧱', zout: '🧂', bel: '🔔',
  loep: '🔍', kous: '🧦', reus: '🧌', les: '🏫',
  // kern 6 (g, ui, au, f, ei)
  muis: '🐭', geit: '🐐', mug: '🦟', duif: '🕊️', ei: '🥚', huis: '🏠', fee: '🧚', duim: '👍', gat: '🕳️',
  vijf: '5️⃣', bui: '🌧️', geel: '🟡', fout: '❌', ui: '🧅', saus: '🥣',
  // kern 7 (klusters, ng, sch)
  ster: '⭐', klok: '🕰️', bloem: '🌸', trap: '🪜', ring: '💍', stoel: '🪑', slak: '🐌', schip: '🚢',
  vlag: '🚩', spin: '🕷️', zwaan: '🦢', tong: '👅', brug: '🌉', melk: '🥛', kraan: '🚰', wolk: '☁️',
  fles: '🍾', berg: '⛰️', tent: '⛺', vork: '🍴', school: '🏫', arm: '💪',
  // kern 8 (eind -d, nk, ch(t), schr, verkleinwoorden)
  hond: '🐕', brood: '🍞', hand: '✋', krant: '📰', paard: '🐴', licht: '💡', plant: '🪴', bank: '🛋️',
  strand: '🏖️', nacht: '🌃', mand: '🧺', schrift: '📓', visje: '🐟', huisje: '🏠',
  // kern 9–11 (samenstellingen, twee lettergrepen)
  haai: '🦈', appel: '🍎', vlinder: '🦋', konijn: '🐰', banaan: '🍌', leeuw: '🦁', sneeuw: '❄️',
  sleutel: '🗝️', spiegel: '🪞', voetbal: '⚽', koning: '👑', ketting: '📿', vrolijk: '😄', regenboog: '🌈',
}

/** The main vowel cluster of a word — for spreading vowels across the list. */
function vowelKey(word: string): string {
  const digraphs = ['aai', 'ooi', 'oei', 'eeuw', 'ieuw', 'aa', 'ee', 'oo', 'oe', 'ie', 'ui', 'ou', 'ei', 'ij', 'eu', 'uu', 'au']
  for (const d of digraphs) if (word.includes(d)) return d
  const m = word.match(/[aeiou]/)
  return m ? m[0] : 'x'
}

/** Round-robin words across vowel groups so the same vowel rarely repeats
 *  back-to-back when a child steps through the list. Deterministic. */
function mixByVowel(words: string[]): string[] {
  const groups = new Map<string, string[]>()
  for (const w of words) {
    const g = groups.get(vowelKey(w)) ?? []
    g.push(w)
    groups.set(vowelKey(w), g)
  }
  const buckets = [...groups.values()].sort((a, b) => b.length - a.length)
  const out: string[] = []
  for (let round = 0; out.length < words.length; round++) {
    for (const b of buckets) if (round < b.length) out.push(b[round])
  }
  return out
}

function wordItem(word: string): ContentItem {
  const item: ContentItem = {
    id: `word-${word}`,
    type: 'word',
    glyphs: [...word].map(glyphFor),
    prompt: word,
    answer: word,
    tags: ['woord'],
    source: 'base',
  }
  if (WORD_EMOJI[word]) item.image = { kind: 'emoji', value: WORD_EMOJI[word] }
  return item
}

function sumItem(a: number, op: '+' | '-', b: number): ContentItem {
  const result = op === '+' ? a + b : a - b
  const chars = [...String(a), op, ...String(b), '=', ...String(result)]
  return {
    id: `sum-${a}${op === '+' ? 'p' : 'm'}${b}`,
    type: 'sum',
    glyphs: chars.map(glyphFor),
    prompt: `${a} ${op} ${b} =`,
    answer: String(result),
    sum: { a, op, b, result },
    tags: ['som'],
    source: 'base',
  }
}

const words = mixByVowel(Object.keys(WORD_EMOJI)).map(wordItem)
const sums: ContentItem[] = [
  sumItem(1, '+', 2),
  sumItem(2, '+', 3),
  sumItem(3, '+', 1),
  sumItem(4, '+', 1),
  sumItem(2, '+', 2),
  sumItem(5, '-', 2),
  sumItem(4, '-', 1),
]

const pack = {
  schemaVersion: 1,
  name: 'Basis Nederlands',
  locale: 'nl-NL',
  items: [...all.map(itemFor), ...words, ...sums],
}

// Round coordinates to keep the JSON small and readable.
const rounded = JSON.parse(
  JSON.stringify(pack, (_k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)),
)

const here = dirname(fileURLToPath(import.meta.url))
const outPath = joinPath(here, '..', 'src', 'data', 'base-content.json')
writeFileSync(outPath, JSON.stringify(rounded, null, 1) + '\n')
console.log(`wrote ${rounded.items.length} items to ${outPath}`)
