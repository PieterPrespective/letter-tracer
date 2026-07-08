# 07 — UI/UX & Feedback

Design for a **4–6 year-old** on an 11" tablet, with a parent occasionally
driving the editor. Big targets, minimal text, immediate positive feedback,
no dead ends, no way to get "stuck" or lost.

## Screens

### Home / picker (`ui/screens/home.ts`)

- Large tiles grouped by category: **Letters**, **Cijfers** (numbers),
  **Woorden** (words), **Sommen** (sums). Optional tag filters ("groep 3",
  "eigen").
- Each tile shows the glyph/word big and clear. Recently-added user content is
  easy to find.
- A small, **parent-gated** button opens the editor and settings (gate: e.g.
  "hold 2s" or a simple "how many is 3+4?" adult check — keep it lightweight, its
  only job is to stop a 4-year-old wiping content).
- Landscape-first layout; reflow to portrait.

### Trace screen (`ui/screens/trace.ts`)

The core experience. Elements:

- The **glyph "road"** centred with generous padding.
- A pulsing **start dot** on the current stroke and a **direction arrow** showing
  schrijfrichting; these fade once the child is reliably on-path.
- The **completed strokes** shown filled/coloured; the **current stroke's** road
  highlighted; upcoming strokes shown faintly so the whole letter is previewed.
- A subtle **progress trail** following the pen along the road.
- Minimal HUD: back button (to picker), replay/clear button, and a small
  stroke-progress indicator (e.g. "1 / 2"). No timers, no scores on screen.
- On stroke complete: a quick satisfying pop/sparkle at the stroke end.
- On glyph complete: a **celebration** (stars burst, colour fill of the letter,
  cheerful sound) then a "next" affordance (and, in a word, auto-advance to the
  next letter).

### Editor (`ui/screens/editor.ts`)

Parent-facing; plain forms (see `06`). Text-heavy is fine here; it's the one
place adult reading is assumed. Always show a **live tracing preview** of what
will be created.

## Feedback design (`render/feedback.ts`)

**Positive, immediate, forgiving** — the blueprint's "not too punishing" mandate:

- **On-path:** trail glows/fills smoothly; optional soft tick sound at intervals.
- **Off-path:** the pen's trail turns a gentle colour and a soft nudge appears
  pointing back to the road — **never** a red X, buzzer, or "wrong". The child
  simply can't make progress off-road; guide them back.
- **Wrong start / wrong direction:** animate the start dot + arrow ("begin hier",
  optional voice/label), don't scold.
- **Stroke complete:** small sparkle + the stroke locks into its "done" colour.
- **Glyph complete:** big celebration; earn 1–3 **stars** (generous cutoffs from
  `05`); the traced letter fills with colour and maybe wiggles.
- Keep animations short (≤ ~1.2s) so an eager child isn't blocked.

## Audio (`util/audio.ts`, optional but high-value)

- WebAudio (or preloaded `<audio>`) short effects: on-path tick, stroke-complete
  pop, celebration jingle.
- Optional **letter sound**: speak the phoneme/name of the letter on start and on
  completion. Use the Web Speech API (`speechSynthesis`) with a **Dutch (nl-NL)**
  voice if available; gracefully skip if not. (Speech voices are not guaranteed
  offline on all devices — treat as enhancement, and prefer bundled audio clips
  for the core sounds so offline is unaffected.)
- Global mute in settings; respect it everywhere.

## Visual style

- Bright, friendly, high-contrast. Large rounded shapes.
- The "road" colour distinct from the "done" colour distinct from background.
- Avoid tiny UI; every interactive target ≥ ~48 CSS px.
- Prefer a warm paper background over stark white to reduce glare on the tablet.

## Accessibility

- **Colour is never the only signal:** pair colour feedback with motion/shape
  (arrows, sparkles, fill) so colour-blind children still get cues.
- Respect `prefers-reduced-motion`: tone down celebration particle effects.
- The canvas game itself isn't screen-reader traceable, but the **DOM chrome**
  (home tiles, editor, dialogs) uses semantic elements, labels, and focus order.
- Large hit targets and generous tracing tolerance are themselves accessibility
  features for developing motor skills.

## Authoring / debug overlay (dev tool, ties to `03`)

A toggle (dev-only, e.g. `?debug=1`) that, on the trace screen, draws:

- Stroke **numbers**, **start dots**, **direction arrows** for every stroke.
- The tolerance band outline and the resampled target points.
- The live `closestOnPolyline` snap point and current progress value.

This is the tool a Dutch reviewer uses to validate schrijfrichting/stroke order
(see `03`) and that developers use to debug the engine.

## Copy & language

All child-facing copy in **Dutch**, minimal and encouraging ("Goed zo!", "Begin
bij de stip", "Nog één!"). Editor copy in Dutch too. Keep a tiny strings module
so copy is centralised and easy to adjust.
