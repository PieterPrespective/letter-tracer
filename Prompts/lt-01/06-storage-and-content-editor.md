# 06 — Storage & Content Editor

## Why IndexedDB

User-authored content (words, sentences, custom sums) and optional progress must
survive restarts and work offline. IndexedDB is the right store (structured,
async, large-capacity). `localStorage` is acceptable for tiny settings only
(e.g. last-used tolerance profile), per the blueprint.

Optional dependency: **`idb`** (tiny promise wrapper) to avoid raw IndexedDB
boilerplate. Otherwise hand-roll a thin `db.ts`.

## Database design (`storage/db.ts`)

- DB name: `letter-tracer`.
- Version: start at **1**; bump on schema changes with an `onupgradeneeded`
  migration.
- Object stores:
  - `userContent` — key `id`, value `ContentItem` (`source: 'user'`).
    Index: `by-type` (type), `by-tag` (multiEntry on tags).
  - `settings` — key/value bag (tolerance profile, sound on/off, last screen).
  - `progress` *(optional, later)* — key `exerciseId`, value `{ stars, attempts,
    lastPlayed }`.
- Base content is **not** stored in IndexedDB; it's bundled JSON loaded at
  startup. The in-memory registry merges base + user (see below). Rationale:
  base content ships with the app version; storing it in the DB would create
  stale-copy/migration headaches.

## Content registry (`model/content.ts`)

A single in-memory source of truth the UI reads from:

- On boot: `loadBasePack()` (bundled JSON, validated) → then
  `loadUserContent()` from IndexedDB → merge into one `Map<id, ContentItem>`.
- User items with the same `id` as a base item **shadow** the base item (allow
  overriding a base exercise); keep `source` correct for edit/delete rules.
- Exposes queries: `list(type?)`, `get(id)`, and mutation methods that write
  through to `content-repo.ts` and update the in-memory map + emit a change event
  so open screens refresh.

## Content repo (`storage/content-repo.ts`)

CRUD over `userContent`:

- `create(item)`, `update(item)`, `delete(id)` — validate via `schema.ts` before
  writing; reject edits/deletes targeting `source: 'base'` items (they can only
  be *shadowed* by creating a user item with the same id).
- `exportPack(): ContentPack` — gather all user items into a `ContentPack`
  envelope for download.
- `importPack(pack)` — validate + migrate, then upsert items. Conflict policy:
  prompt or default to "keep both" by suffixing ids; document the choice.

## The in-app content editor (`ui/screens/editor.ts`)

Goal: a **parent** can add traceable content without touching code. Editor
capabilities, in priority order:

### MVP editor (must-have)

1. **Add a word / sentence.** Parent types text; the app composes a `ContentItem`
   by looking up each character in the **glyph library** (from base content). Any
   character with no glyph is flagged (e.g. rare punctuation). Preview renders the
   composed word with the tracing overlay. Save → IndexedDB.
2. **Add a sum.** Parent enters `a`, operator (`+`/`-`), `b`; app computes the
   result and composes glyphs `a op b = result`, all traceable. Validate
   `result === a op b`.
3. **List / edit / delete** user items (with the base/user distinction and
   delete confirmation).
4. **Import / export** content packs (file download + file picker), for backup
   and sharing between devices — the offline "sync" story.

### Nice-to-have (later)

5. **Tagging** (e.g. "groep 3", "eigen woorden") + filter on home screen.
6. **Per-item difficulty/tolerance** override in the UI (maps to `Stroke.tolerance`
   / a per-item tolerance profile).
7. **Custom glyph authoring** (draw a new letter's strokes) — powerful but
   involved; defer. When built, it reuses the same canvas + start/arrow overlay
   from the tracing screen in an "author mode" that records strokes into glyph
   space.

## Settings

Small `settings` store: sound on/off, tolerance profile (Makkelijk / Normaal /
Precies mapping to config presets), preferred hand (left/right — affects which
side hint arrows sit, optional), last screen for quick resume.

## Data safety & limits

- Wrap all writes in try/catch; surface a non-blocking toast on quota errors.
- IndexedDB on Android WebView/Chrome is durable but can be evicted under storage
  pressure. Because export exists, encourage periodic export; optionally request
  **persistent storage** (`navigator.storage.persist()`) on first user content
  save to reduce eviction risk.
- Validate everything on the way in (`schema.ts`) so a corrupt import can't crash
  the tracing engine later.
