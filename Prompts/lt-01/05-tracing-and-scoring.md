# 05 — Tracing Engine, Hit-Testing & Scoring

This is the heart of the app. All logic here is **pure and DOM-free** (glyph
space, `0..1000`), so it is fully unit-testable (see `10`). The renderer and
input layer only feed it points and read its state.

## Geometry primitives (`geometry/polyline.ts`)

Implement and unit-test these first:

- `distToSegment(p, a, b): number` — shortest distance from point to segment.
- `closestOnSegment(p, a, b): { point, t }` — projection + clamped parameter.
- `polylineLength(pts): number` and `cumulativeLengths(pts): number[]`.
- `resample(pts, spacing): Point[]` — uniform arc-length resampling.
- `closestOnPolyline(p, pts): { dist, segIndex, t, arcLen }` — nearest point on a
  polyline and its **arc-length position** (used as the progress cursor).

Store each target stroke **pre-resampled** with its `cumulativeLengths` cached so
`closestOnPolyline` and progress math are cheap per input sample.

## Tolerance

- Base tolerance = `config.toleranceFraction` × 1000 (blueprint suggests
  **8–12% of letter height** → default **0.10**). Overridable per stroke
  (`Stroke.tolerance`).
- Tolerance is generous by design (young children). Consider a slightly larger
  tolerance near stroke **start** to make it easy to "get on the road", tapering
  to the base value — optional refinement.

## The tracing state machine (`tracing/engine.ts`)

Per glyph, the engine tracks:

```ts
interface EngineState {
  glyph: Glyph;
  currentStroke: number;         // index into glyph.strokes
  progress: number;              // arc-length covered on current stroke, 0..1
  status: 'idle' | 'awaiting-start' | 'tracing'
        | 'stroke-complete' | 'glyph-complete' | 'off-path';
  strokeSamples: Point[];        // child's raw samples for current stroke (debug/scoring)
}
```

### Lifecycle

**`beginStroke(p)`** (on pointerdown):
- Compute distance from `p` to the **start point** of the current target stroke.
- If within `startTolerance` (a bit larger than base tolerance), enter `tracing`,
  set `progress = 0`, record the sample.
- Else → `off-path` / `wrong-start`: do **not** begin. Emit gentle feedback
  ("begin bij de stip"). This enforces **direction/schrijfrichting** at the start,
  because the child must start at the stroke's first point, not its end.

**`addPoint(p)`** (on each coalesced pointermove sample):
- `hit = closestOnPolyline(p, currentStrokePts)`.
- **On-path?** `hit.dist <= tolerance`.
- **Forward progress?** Convert `hit.arcLen` to normalised `0..1`; accept only if
  it is **≥ current progress − backslack** (small backtrack allowance) and does
  not jump forward by more than `maxForwardJump` (prevents skipping across the
  glyph / cutting corners). This enforces monotonic, in-direction tracing.
- If on-path & valid forward: advance `progress = max(progress, newProgress)`;
  append accepted trail point; status `tracing`.
- If off-path: status `off-path`; hold `progress`; render correction hint. Do
  **not** advance. (Do not fail the stroke outright — the child can return to the
  road and continue.)
- When `progress >= completeThreshold` (e.g. **0.92**, so they needn't hit the
  exact last pixel) and the last accepted sample is near the stroke **end** →
  `stroke-complete`.

**`endStroke()`** (on pointerup):
- If `stroke-complete`: commit the stroke; advance `currentStroke`. If that was
  the last stroke → `glyph-complete`. Else → `awaiting-start` for the next stroke.
- If not complete: keep the stroke's progress (so lifting the pen mid-stroke and
  resuming is allowed) but revert status to `awaiting-start`/`tracing-paused`.
  Design choice — see "Forgiveness policy" below.

### Coverage vs. corner-cutting

Progress is arc-length based, so the child must actually travel the path, not
just touch start and end. Combine two gates for `stroke-complete`:

1. **Coverage:** `progress >= completeThreshold` (traversed most of the length).
2. **Endpoint:** last accepted point within `endTolerance` of the stroke end.

Optionally also require a minimum fraction of resampled target points to have
been "visited" (each target sample within tolerance of some accepted sample) to
prevent long straight shortcuts on curved strokes.

## Direction & order validation (`tracing/validation.ts`)

- **Order** is enforced structurally: the engine only ever accepts input for
  `currentStroke`; strokes must be completed in index order.
- **Direction** is enforced by the monotonic-forward-progress rule plus the
  start-point gate in `beginStroke`. A child dragging from the wrong end starts
  off the start point (rejected) or, if they somehow begin near start and move
  backward, fails the forward-progress check.
- Expose pure predicates for tests: `isValidStart(glyph, strokeIdx, p)`,
  `isForward(prevProgress, newProgress)`, `isComplete(state)`.

## Scoring (`tracing/scoring.ts`)

Scoring is **encouraging**, not graded harshly. Compute per stroke and aggregate
per glyph/exercise:

- **Accuracy:** mean (or RMS) distance of accepted samples from the path,
  normalised to tolerance → map to 0..1 (closer = higher). Off-path excursions
  count against it mildly.
- **Coverage:** fraction of path length actually traversed (should be ≥ threshold
  to complete anyway).
- **Smoothness (optional):** penalise large direction reversals / jitter.
- **Stars:** map the combined score to 1–3 stars with **generous** cutoffs
  (e.g. completing at all = 1 star; decent accuracy = 2; clean = 3). Never show 0.

Keep raw metrics available for a parent "how did it go" view, but the child sees
stars/celebration only.

## Forgiveness policy (tunable, in `config.ts`)

Defaults tuned for a 4–6 year-old:

- `toleranceFraction: 0.10`
- `startToleranceFraction: 0.14`
- `endToleranceFraction: 0.12`
- `completeThreshold: 0.92`
- `backslack: 0.04`          // allowed backward progress before "off-path"
- `maxForwardJump: 0.15`     // anti-corner-cut
- `allowResumeAfterLift: true`  // lifting mid-stroke doesn't reset progress

All thresholds live in one config object so they can be tuned from on-device
testing without hunting through the code.

## Edge cases to handle & test

- Zero-length or degenerate strokes (guard in schema; `polylineLength > 0`).
- Very fast pen movement → sparse samples between coalesced points: interpolate
  along the segment between consecutive accepted samples before the progress/
  coverage check, so fast strokes don't under-count coverage.
- Self-intersecting glyphs (e.g. `8`, `g` loop): `closestOnPolyline` can snap to
  the wrong branch. Mitigate by **searching near the current progress cursor**
  first (local window along arc-length) before a global nearest search.
- Overlapping start/end (closed loops like `o`): use coverage + a required
  minimum arc travelled, not just endpoint proximity, to detect completion.
- Multi-stroke glyphs where stroke 2 starts near stroke 1 (e.g. `t` cross):
  start-point gate is per-stroke, so this is fine as long as order is enforced.
