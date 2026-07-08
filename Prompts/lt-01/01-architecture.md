# 01 — Architecture

## Stack

- **Language:** TypeScript (strict).
- **Build:** Vite 6 (already configured; `base: '/letter-tracer/'`).
- **Rendering:** a single HTML5 `<canvas>` 2D context. No framework, no virtual
  DOM. UI chrome (menus, editor) is plain DOM/CSS layered over/around the canvas.
- **Input:** Pointer Events API (unifies finger + S-Pen + mouse).
- **Persistence:** IndexedDB (via a thin typed wrapper — see `06`).
- **PWA:** hand-written service worker + Web App Manifest (see `08`). Optional:
  `vite-plugin-pwa` may be adopted later, but the MVP uses a hand-written SW to
  keep the dependency surface small and the caching behaviour explicit.

### Dependency policy

Default to **zero runtime dependencies**. Justify any addition in the PR that
introduces it. Candidate exceptions, only if they clearly pay for themselves:

- `idb` (Jake Archibald) — ergonomic IndexedDB promises. Acceptable; tiny.
- `vite-plugin-pwa` — only if the hand-written SW becomes a maintenance burden.

Everything else (geometry, hit-testing, DTW-free scoring, rendering) is
hand-written and unit-tested.

## Module layout

```
src/
  main.ts                 # bootstrap: mount app, register SW, route to screen
  app.ts                  # top-level app controller / screen switching
  config.ts               # tunable constants (tolerances, colours, sizes)

  model/
    types.ts              # ContentItem, Glyph, Stroke, Point, Exercise types
    schema.ts             # runtime validation + schema version/migration
    content.ts            # in-memory content registry (base + user content)

  data/
    base-content.json     # shipped base dataset (letters, digits)
    glyphs/               # optional: per-glyph stroke data split out if large

  geometry/
    point.ts              # Point ops: add/sub/dist, lerp
    polyline.ts           # resample, arc-length, distance-to-segment/polyline
    bezier.ts             # (optional) flatten Bézier -> polyline
    box.ts                # normalised 0..1000 box <-> screen transforms

  tracing/
    engine.ts             # TraceEngine: per-glyph tracing state machine
    scoring.ts            # per-stroke + per-glyph scoring (pure)
    validation.ts         # order + direction + coverage checks (pure)

  render/
    canvas.ts             # canvas setup, DPR handling, resize
    glyph-renderer.ts     # draw target strokes, guides, start dots, arrows
    trail-renderer.ts     # draw the child's live trail + progress
    feedback.ts           # celebration / correction visuals

  input/
    pointer.ts            # Pointer Events -> normalised stroke samples
    coalesced.ts          # getCoalescedEvents handling for high-rate pens

  storage/
    db.ts                 # IndexedDB open/upgrade
    content-repo.ts       # CRUD for user content + content packs
    progress-repo.ts      # (optional) per-exercise progress/stars

  ui/
    screens/
      home.ts             # exercise picker
      trace.ts            # the tracing screen (canvas + HUD)
      editor.ts           # content editor
    components/           # buttons, dialogs, toasts
    styles/               # CSS

  pwa/
    sw.ts                 # service worker source (built to /sw.js)
    register.ts           # SW registration + update prompt

  util/
    events.ts             # tiny typed event emitter
    audio.ts              # optional sound effects (WebAudio)
```

Split files out only as they grow; the point is the boundaries, not premature
fragmentation. The **hard boundary** to preserve: `geometry/`, `tracing/`, and
`model/` are **pure and DOM-free**, so they unit-test in Node without jsdom.

## Coordinate systems

Three spaces, converted explicitly (never mixed):

1. **Glyph space** — normalised integer box **0..1000 on both axes**, origin
   top-left, y-down. All stored stroke data lives here. Device- and
   size-independent. (The blueprint mentions Android SDKs using ~420×420; 0..1000
   is the same idea with more resolution.)
2. **Canvas/CSS space** — the on-screen rectangle where the current glyph is
   drawn, in CSS pixels. A single affine transform (scale + translate, preserving
   aspect ratio, centred with padding) maps glyph→canvas.
3. **Device space** — canvas backing store pixels = CSS pixels × `devicePixelRatio`.
   Handled once in `render/canvas.ts` by scaling the 2D context.

All hit-testing happens in **glyph space**: incoming pointer samples are mapped
canvas→glyph immediately, so tolerances are defined once, resolution-independent
(e.g. "tolerance = 10% of 1000 = 100 units").

## State model

A small explicit state machine, no framework:

- **AppState**: `{ screen: 'home' | 'trace' | 'editor', … }`.
- **TraceSession** (owned by the trace screen): current `ContentItem`, current
  glyph index, and a `TraceEngine` instance.
- **TraceEngine** (in `tracing/engine.ts`) holds per-glyph progress:
  `currentStrokeIndex`, `progressAlongStroke` (arc-length 0..1), completed
  strokes, and derives status (`idle | tracing | stroke-complete | glyph-complete
  | off-path`). It exposes pure-ish methods: `beginStroke(pt)`, `addPoint(pt)`,
  `endStroke()`, `reset()`, and getters for what the renderer needs.

State changes emit events (tiny typed emitter in `util/events.ts`); the renderer
subscribes and redraws. Rendering is driven by `requestAnimationFrame`, decoupled
from input frequency.

## Data flow (one traced stroke)

```
PointerEvent(s)
  -> input/pointer.ts       (coalesced samples, canvas coords)
  -> box.ts                 (canvas -> glyph space)
  -> TraceEngine.addPoint   (updates progress / detects off-path)
  -> scoring/validation     (pure checks)
  -> emits 'progress'/'stroke-complete'/'off-path'
  -> render loop            (trail-renderer + glyph-renderer + feedback)
```

## Build/output notes

- Entry stays `index.html` → `src/main.ts`.
- Service worker is built as a **separate entry** so it lands at a stable URL
  (`/sw.js` under the `/letter-tracer/` base). See `08` for the Vite config
  addition (either a second Rollup input or `vite-plugin-pwa`).
- Base dataset ships as a static JSON import (bundled) so it is available on very
  first paint even before IndexedDB is populated.
