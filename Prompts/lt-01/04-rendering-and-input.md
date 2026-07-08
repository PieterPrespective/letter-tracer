# 04 — Rendering & Input

## Canvas setup (`render/canvas.ts`)

- One full-area `<canvas>` for the trace screen. Size the **backing store** to
  `cssWidth * devicePixelRatio` × `cssHeight * devicePixelRatio`; set CSS size to
  the layout box; then `ctx.scale(dpr, dpr)` once so all drawing uses CSS pixels.
- Handle **resize** and **orientation change** (Tab S8 portrait↔landscape) via a
  `ResizeObserver` on the canvas container. On resize: recompute the DPR backing
  store and the glyph→canvas transform, then request a redraw. Never draw at
  fractional DPR without rescaling — it causes blur.
- Cap DPR at ~2–3 to avoid needless overdraw on very high-DPI panels (config).
- Use a **render loop** driven by `requestAnimationFrame`, but only actually
  redraw when marked dirty (input, animation, resize). A persistent celebration
  animation keeps the loop running until it finishes.

### Layers / draw order (per frame)

1. Background (paper texture or flat colour).
2. **Target glyph**: faint filled "road" (the tolerance band) + centre-line
   guide, drawn by `glyph-renderer.ts`.
3. **Start dot** for the current stroke + **direction arrows** (kid guidance).
4. **Completed strokes**: rendered in a "done" colour.
5. **Child's live trail**: the accepted progress path + current pen position
   (`trail-renderer.ts`).
6. **Feedback overlay**: sparkles/stars/correction hints (`feedback.ts`).

Consider drawing the mostly-static layers (1–3) into an **offscreen canvas**
(or cache) per glyph and blitting it, then only redraw the dynamic layers (4–6)
each frame. This keeps 60 fps easy even on the tablet.

## Drawing the "road" (tolerance band)

- The forgiving band is the stroke centre-line stroked with a wide, round-capped,
  round-joined line whose width = `2 × tolerance` (in glyph space, transformed to
  canvas). This both *shows* the child where to trace and *is* the visual of the
  hit-test tolerance.
- Draw the centre-line thinner on top as a dotted/faint guide.
- Use `lineJoin='round'`, `lineCap='round'` to avoid spiky corners on turns.

## Input pipeline (`input/pointer.ts`)

Use **Pointer Events** exclusively (works for finger, S-Pen, mouse). On the trace
canvas:

- Set `touch-action: none` (CSS) on the canvas so the browser doesn't scroll/zoom
  while tracing. Also prevent default on `pointerdown`/`pointermove`.
- `setPointerCapture(e.pointerId)` on `pointerdown` so a stroke that briefly
  leaves the canvas still tracks.
- Track a **single active pointer** for tracing (ignore secondary pointers to
  avoid multi-touch chaos; optionally reserve two-finger for a "clear" gesture).

### Sample extraction

- On `pointerdown`: begin a stroke → `TraceEngine.beginStroke(pt)`.
- On `pointermove`: read **coalesced events** via
  `e.getCoalescedEvents()` to capture the S-Pen's high report rate (the pen can
  emit far more samples than rAF frames). Map each to glyph space and feed
  `TraceEngine.addPoint(pt)` in order.
- On `pointerup` / `pointercancel`: `TraceEngine.endStroke()`; release capture.

### S-Pen specifics

- `pointerType === 'pen'`; may include `pressure`, `tiltX/Y`, and (on hover)
  events with `buttons === 0`. Ignore **hover** moves (no button) for tracing;
  optionally use them to render a small pen cursor.
- Do **not** require pressure; treat any contact as a valid sample so finger and
  pen behave the same. Optionally use pressure only for trail thickness (cosmetic).
- Palm rejection: because we track a single active pointer and use pointer
  capture, an accidental palm touch after the pen is down is ignored. Prefer the
  **pen** pointer if both a pen and touch are active simultaneously.

### Coordinate mapping

- Convert client coords → canvas CSS coords using
  `canvas.getBoundingClientRect()` (cache it; refresh on resize/scroll).
- Then canvas → glyph space via the current transform (`box.ts`). All engine
  logic is in glyph space.

## Performance targets & tactics

- **Rendering:** 60 fps. Achieved by static-layer caching + minimal per-frame
  redraw. The letter-tracer has no ML, so this is easily met on the Snapdragon
  8 Gen 1.
- **Input latency:** keep the accepted-trail head glued to the pen. Process
  coalesced samples every frame; never block the input thread with heavy work
  (scoring is O(points) and cheap).
- Avoid per-frame allocations in the hot path (reuse point objects/arrays where
  practical); keep geometry functions allocation-light.
- Guard against pathological input: clamp the number of samples retained per
  stroke; resample the child's trail if it gets huge.

## Non-canvas UI

Home screen, editor, dialogs, and toasts are **plain DOM + CSS** (in `ui/`),
positioned around/over the canvas. Only the tracing surface itself is canvas.
This keeps text input (editor), scrolling lists, and accessibility semantics in
the DOM where they belong.
