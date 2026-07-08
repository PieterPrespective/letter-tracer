# lt-01 — Letter-Tracer Implementation Plan

A detailed, build-ready implementation plan for the **Dutch letter-tracing PWA**
(blokletters, Pennenstreken-style stroke order). This plan covers **only the
letter-tracer app** — not the dance game or job tracker from the source
blueprint.

Requirements source: [`../source-blueprint-letter-tracer.md`](../source-blueprint-letter-tracer.md)

## How to read this plan

The documents are ordered so that each builds on the previous one. Read `00`
first for scope; the rest can be read in order or jumped into by topic.

| File | Topic |
|------|-------|
| [`00-overview-and-scope.md`](./00-overview-and-scope.md) | Goals, non-goals, target user/device, success criteria |
| [`01-architecture.md`](./01-architecture.md) | Stack, module layout, state model, coordinate systems |
| [`02-data-model.md`](./02-data-model.md) | JSON schema for glyphs, strokes, exercises; versioning |
| [`03-stroke-data-and-pedagogy.md`](./03-stroke-data-and-pedagogy.md) | Hershey sourcing, Dutch schrijfrichting, per-glyph annotation |
| [`04-rendering-and-input.md`](./04-rendering-and-input.md) | Canvas rendering, Pointer Events, S-Pen, DPR/resize |
| [`05-tracing-and-scoring.md`](./05-tracing-and-scoring.md) | Hit-testing, progress cursor, order/direction validation, scoring |
| [`06-storage-and-content-editor.md`](./06-storage-and-content-editor.md) | IndexedDB layer, in-app editor, import/export |
| [`07-ui-ux-and-feedback.md`](./07-ui-ux-and-feedback.md) | Screens, kid-friendly feedback, accessibility, audio |
| [`08-pwa-and-offline.md`](./08-pwa-and-offline.md) | Manifest, service worker, install, offline hardening |
| [`09-milestones.md`](./09-milestones.md) | Phased delivery, task breakdown, definition of done |
| [`10-testing-and-qa.md`](./10-testing-and-qa.md) | Unit/integration/device testing, on-tablet QA checklist |

## Current repo state (starting point)

- Vanilla **TypeScript + Vite 6** scaffold already present (`package.json`,
  `vite.config.ts`, `index.html`, `src/main.ts`, `tsconfig.json`).
- Vite `base` is `/letter-tracer/` for GitHub Pages.
- CI/CD already wired: `.github/workflows/deploy.yml` builds and publishes to a
  `gh-pages` branch on push to `main`. **Deployment is out of scope for this plan.**

## Guiding principles

1. **Offline-first, zero backend.** Everything runs client-side; the network is
   only needed for the very first load.
2. **Data-driven.** Letters, numbers, words, and sums are data, not code. Adding
   content never requires a code change.
3. **Forgiving, not punishing.** Tolerances favour a 4–6 year-old succeeding.
4. **Touch + S-Pen parity.** Pointer Events unify finger and stylus; no
   mouse-only assumptions.
5. **Small dependency surface.** Prefer hand-written modules over libraries; the
   tablet build must stay light and the code must stay legible for AI-driven edits.
