# 08 — PWA & Offline

The app must **install to the home screen** and **work fully offline** after the
first load (blueprint: "Must work offline (service worker) and install as PWA").
The Tab S8 is the install target; assume spotty/no connectivity during travel.

## Web App Manifest (`public/manifest.webmanifest`)

- `name`: "Letter Tracer", `short_name`: "Letters".
- `start_url`: `/letter-tracer/` (must match the Pages base). Use a relative
  `start_url` / `scope` that respects the `/letter-tracer/` base so install works
  on the project-page URL.
- `scope`: `/letter-tracer/`.
- `display`: `standalone` (or `fullscreen` for an immersive kids' app — pick
  `standalone` for a system back affordance; revisit).
- `orientation`: `any` (support both; landscape-first UI).
- `background_color` / `theme_color`: match the warm background.
- `icons`: 192, 512, and a **512 maskable** icon. Generate from one source SVG.
- Link it from `index.html` (`<link rel="manifest" ...>`) and add
  `theme-color`, `apple-touch-icon`, and viewport `viewport-fit=cover` meta.

## Service worker (`src/pwa/sw.ts` → built to `sw.js`)

Strategy: **precache the app shell + assets; cache-first for static, with a
network fallback only for first fetch.** Because everything is client-side and
data lives in IndexedDB, offline is straightforward.

- **Precache** on `install`: the built JS/CSS, `index.html`, manifest, icons,
  fonts, base content JSON, and any bundled audio clips. Use the build manifest
  so hashed filenames are cached correctly (this is exactly what
  `vite-plugin-pwa`/Workbox automate — see below).
- **Activate:** clean up old caches (versioned cache name, e.g.
  `lt-cache-v{BUILD_HASH}`).
- **Fetch:**
  - Navigation requests → serve cached `index.html` (SPA-style app shell).
  - Static assets → **cache-first**, fall back to network, then put in cache.
  - Never cache cross-origin/opaque requests (there are none in the offline core;
    optional CDN voices are best avoided for offline).
- **Updates:** on new SW version, show a subtle "nieuwe versie beschikbaar –
  tik om te vernieuwen" prompt (`pwa/register.ts`), then `skipWaiting` +
  `clients.claim` on user confirm. Don't hard-reload mid-trace.

### Build integration (important)

The service worker must know the **hashed asset filenames** Vite emits. Two
acceptable approaches:

1. **`vite-plugin-pwa`** (recommended for correctness): generates the SW +
   precache manifest automatically, injects the manifest link, handles updates.
   Configure `base: '/letter-tracer/'`, `registerType: 'prompt'`,
   `workbox.globPatterns` covering JS/CSS/HTML/JSON/audio/icons. This is the
   pragmatic choice and keeps the precache list correct as the app grows.
2. **Hand-written SW** as a separate Rollup input, consuming Vite's
   `manifest.json` (`build.manifest = true`) at build time via a tiny script that
   injects the file list into the SW. More code to own; only choose this if
   avoiding the dependency is a hard requirement.

> Recommendation: start with the hand-written SW for the very first offline pass
> if you want zero new deps, but **adopt `vite-plugin-pwa` before shipping** so
> precache stays correct across builds. Document whichever is chosen.

## Offline data considerations

- Base content is **bundled + precached**, so it's available offline on first run.
- User content is in **IndexedDB** (already offline-durable). Consider
  `navigator.storage.persist()` after first user save to reduce eviction (see `06`).
- Optional TTS voices may not be available offline — core sounds should be
  **bundled audio**, not TTS, so the offline experience is unaffected (see `07`).

## Install UX

- Listen for `beforeinstallprompt`; stash it and show a friendly "Zet op je
  startscherm" button (esp. useful in Samsung Internet / Chrome).
- Detect `display-mode: standalone` to hide the install button once installed.
- Verify the installed app launches at `start_url` and the base path resolves
  (a wrong `base`/`scope` is the classic Pages-project-page bug — test it).

## Offline acceptance test (also in `10`)

1. Load the app online once (installed).
2. Turn on airplane mode.
3. Cold-launch from the home-screen icon.
4. Verify: home tiles load, tracing works, celebration + audio play, adding a
   word in the editor persists and is traceable, and a relaunch still shows it.
