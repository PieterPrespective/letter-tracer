# 10 — Testing & QA

The tracing engine is geometry — deterministic and pure — so it should be
**heavily unit-tested** without a DOM. The UI/PWA layers get lighter integration
and manual on-device testing.

## Test tooling

- **Vitest** (pairs naturally with Vite) for unit + integration tests. Add as a
  dev dependency; wire `npm test` and `npm run test:watch`.
- Keep `geometry/`, `tracing/`, and `model/` importable in Node (no DOM), so
  their tests need no jsdom.
- Optional: **Playwright** (already available in this environment) for a couple
  of smoke tests driving the real canvas with synthetic pointer events. Keep it
  minimal — it's slower and more brittle than the pure-logic tests.

## Unit tests (the important ones)

### `geometry/polyline.ts`

- `distToSegment`: known distances for horizontal/vertical/diagonal segments,
  point-beyond-endpoints clamping, degenerate (a == b) segment.
- `closestOnPolyline`: correct segment index + arc-length for points near, on,
  and far from a multi-segment path; self-intersecting path picks the branch near
  a supplied progress hint.
- `resample`: uniform spacing, endpoints preserved, total length preserved within
  tolerance.
- `cumulativeLengths`: monotonic, last == total length.

### `geometry/box.ts`

- glyph→canvas→glyph round-trips to identity (within float epsilon).
- Aspect-ratio preservation and centring for wide/tall canvases.

### `tracing/engine.ts` + `validation.ts` (synthetic strokes)

Drive the engine with **generated point sequences** and assert state:

- **Correct trace:** points sampled along the target path (with small noise
  within tolerance) → advances to `stroke-complete`/`glyph-complete`.
- **Wrong start:** begin at the stroke's *end* point → rejected (no `tracing`).
- **Wrong direction:** start correct, then move backward → no forward progress /
  `off-path`, never completes.
- **Off-path:** points outside tolerance don't advance; returning to the road
  resumes progress.
- **Corner-cut:** straight line from start to end across a curved stroke →
  coverage gate prevents completion (respect `maxForwardJump`).
- **Resume after lift:** end stroke mid-way, begin again near current progress →
  continues (per `allowResumeAfterLift`).
- **Order enforcement:** multi-stroke glyph — attempting stroke 2 before stroke 1
  completes is rejected.
- **Noise robustness:** jittery-but-on-road input still completes and yields a
  reasonable score.

### `tracing/scoring.ts`

- Perfect trace → 3 stars; sloppy-but-complete → ≥1 star; never 0 on completion.
- Accuracy monotonic in mean deviation; coverage computed correctly.

### `model/schema.ts`

- Valid pack parses; legacy `strokes: Point[][]` migrates to `{points}`.
- Bad items dropped with warnings; `schemaVersion` mismatch hard-fails clearly.
- `sum.result` consistency check catches `2 + 2 = 5`.

### `storage/` (with a fake-indexeddb)

- Use `fake-indexeddb` (dev dep) to unit-test `content-repo` CRUD, export/import
  round-trip, and base-vs-user shadowing rules without a browser.

## Integration / smoke (Playwright, optional, few)

- App boots, home renders tiles, entering a letter shows the road.
- Synthetic pointer sequence along a glyph triggers the completion celebration.
- Editor: add a word → it appears on home → traceable.
- Offline: with SW registered, a second load with network blocked still works.

Keep these few and stable; rely on unit tests for coverage of logic.

## Manual on-device QA checklist (Tab S8)

Run before each meaningful release; this is where real forgiveness/feel is judged.

**Input & feel**
- [ ] Finger tracing smooth; no scroll/zoom hijack while tracing (`touch-action`).
- [ ] S-Pen tracing smooth; high sample rate captured (coalesced events); hover
      doesn't draw.
- [ ] Palm/second-touch while pen down is ignored.
- [ ] Latency: accepted trail stays glued to the pen tip.

**Pedagogy**
- [ ] Every base glyph requires the correct start point and direction.
- [ ] Stroke order enforced on multi-stroke glyphs (`t`, `k`, `A`, `+`, `=` …).
- [ ] Tolerance feels forgiving for a small child, not frustrating.

**Feedback**
- [ ] On-path glow; off-path gentle nudge (never harsh).
- [ ] Stroke-complete + glyph-complete celebrations fire; stars generous.
- [ ] Audio plays; global mute works; `prefers-reduced-motion` respected.

**Content & storage**
- [ ] Words and sums render aligned; per-letter auto-advance works.
- [ ] Editor: add/edit/delete word + sum; parent gate works.
- [ ] Content persists across cold restart; export→import round-trips.

**PWA / offline**
- [ ] Installs to home screen; launches at correct `start_url` under
      `/letter-tracer/` (no broken asset paths).
- [ ] Full offline acceptance test (airplane mode cold launch) passes.
- [ ] Update prompt appears on new deploy; refresh doesn't interrupt a trace.

**Layout**
- [ ] Landscape and portrait both usable; resize/orientation redraw correct;
      no blur (DPR handled).

## CI note

The existing deploy workflow builds on push to `main`. Add a lightweight CI step
(or extend it) to run `npm test` (Vitest, headless) on pushes/PRs so the pure
engine logic is guarded automatically. Deployment itself remains as-is
(out of scope for this plan).
