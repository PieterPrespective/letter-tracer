# Source Blueprint — Letter-Tracer (extracted section)

> Provenance: This is the letter-tracer–relevant excerpt of a larger blueprint
> document ("Laptop-Free Mobile Development on a Galaxy Tab S8 + Galaxy S9: Full
> Stack & Three App Blueprints"). The full document also covered a dance-move
> game, a job tracker, and the overall dev/hosting stack — those parts are
> intentionally omitted here. Only the material that scopes and constrains the
> **letter-tracer** app is kept, so this file can serve as the requirements
> source for the implementation plan in `Prompts/lt-01/`.

---

## Context from the TL;DR

- Build the app as a **browser-based PWA, not a native app** — the letter-tracer
  uses HTML5 Canvas. This sidesteps the hardest laptop-free problem (native
  Android toolchains) while still installing to the home screen and working
  offline.
- The letter-tracer is **low-risk and very achievable during a holiday** (no ML,
  no backend).
- Target device: **Samsung Galaxy Tab S8 (SM-X700)**, touch + S-Pen input.
- Recommended default app stack: **vanilla TypeScript + Vite PWA** (dependency-light).

---

## Key Findings — App 1: Dutch letter-tracing game

- Build on **HTML5 Canvas with Pointer Events**; model each letter as an ordered
  set of stroke paths; use **distance-to-path hit-testing with a tolerance
  radius** for forgiving scoring, plus stroke-order/sequence validation.
- Dutch schools overwhelmingly teach the **Pennenstreken** method (Zwijsen);
  "blokschrift" (block letters) is taught from group 3, and the pedagogy
  emphasises correct **schrijfrichting** (writing direction), start/stop points
  and letter spacing.
- Reusable data: **Hershey single-stroke fonts** (public-domain stroke-path
  letter data, available as SVG via the Inkscape/Evil Mad Scientist project and
  a JavaScript port, "Hershey Text in JS") are an ideal starting point for
  stroke geometry. Existing open-source tracing projects can be forked as
  references.
- Use a **data-driven JSON schema** for letters/numbers/words/sums, with
  user-added content stored in **IndexedDB/localStorage** so the word and
  exercise database is extendable inside the app.

---

## Details — App 1: Letter-tracing game (Dutch, block letters)

**Rendering & capture.** Use a single HTML5 `<canvas>` sized to the tablet.
Represent each letter as an ordered list of strokes, each stroke a
polyline/Bézier path in a normalised 0–1000 coordinate box (the Android tracing
SDKs use a similar 420×420 path approach). Capture input with Pointer Events
(`pointerdown/move/up`) so it works with finger and S-Pen.

**Forgiving hit-testing.** For each sampled touch point, compute the shortest
distance to the current target stroke's path. Accept points within a tolerance
radius (e.g. 8–12% of letter height) and advance a progress cursor along the
path; this yields the "not too punishing" behaviour you want. Validate stroke
**order** and **direction** by checking that the child starts near the stroke's
start point and progresses toward its end — directly supporting the Dutch
**schrijfrichting** requirement.

**Dutch specifics.** Target **blokschrift/blokletters** as taught by
**Pennenstreken** (Zwijsen, the dominant Dutch method) — unjoined simplified
print letters with defined start/stop points and spacing, introduced in group 3.
Model letters in "one continuous movement where possible" per Dutch
handwriting-pedagogy guidance (e.g. the letter 'a' starts at the right-middle so
it closes correctly).

**Stroke-order data.** Bootstrap letter geometry from **Hershey single-stroke
fonts** — public-domain stroke-path data for the Latin alphabet, distributed as
SVG and with a JavaScript port ("Hershey Text in JS"). These give you clean
single-line paths per glyph that you can re-annotate with the pedagogically
correct start point and stroke order. Fork existing open-source letter-tracing
projects (several exist on GitHub, in Canvas/Processing.js and native Android) as
references for the hit-testing loop.

**Extensible content.** Define a JSON schema:

```json
{ "type":"letter|number|word|sum",
  "glyphs":[ { "char":"a", "strokes":[ [ {"x":0,"y":0} ] ] } ],
  "prompt":"a", "answer":"a" }
```

Ship a base dataset; let users add words/sentences and simple
addition/subtraction exercises through an in-app editor that writes to
**IndexedDB** (localStorage is fine for small sets). Sums render as tracing of
the digits and the answer.

**Feasibility: high.** This is a self-contained offline PWA with no ML and no
backend — the best "holiday" project of the three.

---

## Recommendations relevant to the letter-tracer

- Each repo should carry a `CLAUDE.md` describing the stack (vanilla TypeScript +
  Vite PWA is a good, dependency-light default) so Claude Code follows
  consistent conventions.
- **Stage 1 — Quick win:** Build the **letter-tracer** end to end (Canvas
  tracing, Hershey-derived stroke data, JSON content, IndexedDB editor). Ship as
  a PWA, install on the tablet, test with the kids.
- **Stage 3 — Polish & offline-harden:** Add a service worker so the PWA works
  offline during spotty-internet travel; pre-cache assets.

---

## Notes on deployment (already handled in this repo)

The blueprint suggested Cloudflare Pages, but this repo is already wired to
**GitHub Pages** via a GitHub Actions workflow that builds the Vite app and
publishes `dist/` to a `gh-pages` branch on every push to `main`. The
implementation plan therefore treats hosting as solved and focuses on the app
itself. The Vite `base` is set to `/letter-tracer/` for the project-page URL
`https://pieterprespective.github.io/letter-tracer/`.
