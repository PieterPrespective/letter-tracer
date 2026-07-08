# Letter Tracer
Dutch letter-tracing PWA for kids (blokletters,
Pennenstreken-style stroke order).
Stack: Vanilla TypeScript + Vite, HTML5 Canvas,
no frameworks, no backend.
Content is data-driven JSON; user content in IndexedDB.
Must work offline (service worker) and install as PWA.
Target device: Samsung Tab S8, touch + S-Pen input.

The implementation plan lives in [`Prompts/lt-01/`](./Prompts/lt-01/).

## Development

```bash
npm install       # installs deps and activates the local pre-push hook
npm run dev       # Vite dev server
npm run build     # typecheck + production build
```

## Test-driven development

This project is developed **test-driven**. The tracing engine, geometry, and
data model are pure and DOM-free by design (see the plan), so they are cheap and
fast to test. Write the test first, watch it fail, then make it pass.

```bash
npm run test:watch   # TDD inner loop — re-runs on save (use this while coding)
npm test             # run the suite once (headless)
npm run typecheck    # tsc --noEmit
npm run check        # typecheck + tests (what CI and the pre-push hook run)
```

Tests live next to the code they cover as `*.test.ts` / `*.spec.ts` under `src/`.

### Regression testing without burning CI minutes

The suite runs on **every change**, but the goal is for almost all of those runs
to happen **locally, for free**, with CI as a backstop rather than the primary
runner:

1. **Local watch mode is the main loop.** `npm run test:watch` gives instant
   feedback and costs zero CI minutes.
2. **A pre-push git hook** (`.githooks/pre-push`) runs `npm run check` before any
   push, so broken code rarely reaches CI. It's activated automatically by
   `npm install` (via the `prepare` script). Bypass in a pinch with
   `git push --no-verify`.
3. **CI runs only where it adds value:**
   - **`Tests` workflow** (`.github/workflows/test.yml`) runs on **pull requests
     only** — the pre-merge regression gate.
   - **`Deploy` workflow** (`.github/workflows/deploy.yml`) re-runs the suite on
     **push to `main`** and only publishes if it passes — the post-merge gate,
     folded into the deploy job so `main` costs **one** runner, not two.
   - Because Tests is PR-only and Deploy is `main`-only, the suite never
     double-runs on a merge commit.
4. **Docs-only changes skip CI entirely.** Both workflows `paths-ignore`
   markdown, `Prompts/**`, and hook/config files, so editing the plan or README
   never spends minutes or triggers a redeploy.
5. **Each run is kept short** with npm caching (`actions/setup-node` `cache: npm`),
   `concurrency` cancellation of superseded runs, and a `timeout-minutes` guard.

> Note: `letter-tracer` is a **public** repository, and GitHub Actions is free
> and unlimited for public repos on standard runners — so today there is no
> metered budget to burn. The measures above are hygiene and a safety net in
> case the repo is ever made private.

## Deployment

Pushes to `main` build the app and publish `dist/` to the `gh-pages` branch via
`peaceiris/actions-gh-pages` with `force_orphan` (single-commit branch, zero
Actions artifact storage). Set **Settings → Pages → Source = "Deploy from a
branch" → `gh-pages` / `(root)`** once; the site then serves at
`https://pieterprespective.github.io/letter-tracer/`.
