# 09 — Milestones & Task Breakdown

Phased so each milestone is independently demoable on the Tab S8 and shippable as
a small PR (suited to the Claude-Code-on-web workflow). Each milestone lists a
**Definition of Done (DoD)**.

## M0 — Foundations (engine skeleton, no pretty UI)

Goal: prove the core geometry and one hard-coded glyph trace end to end.

- [ ] `model/types.ts` + `model/schema.ts` (validation, legacy migration).
- [ ] `geometry/polyline.ts` with `distToSegment`, `closestOnPolyline`,
      `resample`, `cumulativeLengths` — **unit-tested**.
- [ ] `geometry/box.ts` glyph↔canvas transforms — unit-tested.
- [ ] Hard-code one glyph (`a`) inline; render its road on the canvas.
- [ ] `input/pointer.ts` (Pointer Events, coalesced, glyph-space mapping).
- [ ] `tracing/engine.ts` minimal: start-gate, on-path progress, stroke/glyph
      complete — **unit-tested** with synthetic point sequences.
- **DoD:** on the tablet, you can trace `a` with finger and S-Pen; correct start
  required; wildly off-path doesn't advance; completing shows a console/simple
  "done".

## M1 — Base content & stroke data

Goal: real, reviewed glyph data for the base set.

- [ ] `scripts/build-glyphs.ts` — Hershey → draft `0..1000` glyphs (dev-only).
- [ ] Generate a–z, A–Z, 0–9, `+ - =` drafts.
- [ ] Authoring/debug overlay (start dots, arrows, numbers) behind `?debug=1`.
- [ ] Dutch review pass: correct start/direction/order (Pennenstreken); record
      status in `GLYPH-REVIEW.md`.
- [ ] `src/data/base-content.json` committed; `glyph-library.ts` lookup.
- **DoD:** every base glyph traces correctly with pedagogically correct
  schrijfrichting; reviewer checklist complete (or open items flagged).

## M2 — Real UI & feedback

Goal: it feels like a kids' app.

- [ ] Home picker (Letters/Cijfers/Woorden/Sommen tiles), parent gate.
- [ ] Trace screen HUD (back, clear/replay, stroke progress).
- [ ] `render/feedback.ts`: on-path glow, stroke pop, glyph celebration + stars.
- [ ] `tracing/scoring.ts`: accuracy/coverage → 1–3 stars (generous).
- [ ] Config-driven forgiveness thresholds (`config.ts`).
- [ ] Basic audio (bundled clips) + global mute.
- **DoD:** a child can pick and complete letters/digits with celebratory,
  non-punishing feedback; thresholds tunable without code edits beyond `config`.

## M3 — Words & sums

Goal: multi-glyph exercises.

- [ ] Multi-glyph layout (baseline/x-height/cap alignment, descenders, spacing).
- [ ] Word exercises composed from the glyph library; auto-advance per letter.
- [ ] Sum generation (`a op b = result`) and rendering as traceable glyphs.
- [ ] A handful of base words + sums in `base-content.json`.
- **DoD:** tracing "kat" and "2 + 3 = 5" works end to end with per-glyph advance.

## M4 — Storage & content editor

Goal: parents can extend content; it persists.

- [ ] `storage/db.ts` + `content-repo.ts` (+ optional `idb`).
- [ ] `model/content.ts` registry merging base + user, change events.
- [ ] Editor: add word/sentence, add sum, list/edit/delete, import/export packs.
- [ ] `navigator.storage.persist()` request on first save.
- **DoD:** add a custom word/sum in-app; it appears as an exercise and survives a
  restart; export→import round-trips.

## M5 — PWA & offline hardening

Goal: installable, fully offline.

- [ ] Manifest + icons (192/512/maskable), meta tags, theme colour.
- [ ] Service worker (hand-written first, then `vite-plugin-pwa` before ship),
      precache app shell + base content + audio; versioned cache; update prompt.
- [ ] Install prompt UX; verify `start_url`/`scope` under `/letter-tracer/`.
- **DoD:** the offline acceptance test in `08`/`10` passes on the Tab S8.

## M6 — Polish & on-device tuning

- [ ] Tune tolerances/thresholds from real kid testing.
- [ ] `prefers-reduced-motion`, contrast, target sizes, portrait layout.
- [ ] Optional TTS letter names (nl-NL), progress/stars persistence.
- [ ] Performance pass (static-layer caching, allocation audit) → steady 60 fps.
- **DoD:** smooth, forgiving, kid-tested; no obvious rough edges.

## Suggested PR sequencing

Ship in this order; each is a small, reviewable PR to `main`:

1. geometry + engine core (M0) — heavy on unit tests, no UI risk.
2. glyph build script + base data + debug overlay (M1).
3. home + trace UI + feedback + scoring (M2).
4. words + sums (M3).
5. storage + editor (M4).
6. PWA/offline (M5).
7. polish (M6, possibly several small PRs).

## Cross-cutting definition of done (every PR)

- `npm run build` passes (tsc + vite).
- New pure logic has unit tests; they pass.
- No new runtime dependency without justification in the PR description.
- Manually verified on a Chromium browser; engine changes verified on the tablet
  when feasible.
