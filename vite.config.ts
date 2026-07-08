import { defineConfig } from 'vitest/config'

// Deployed to GitHub Pages as a project site:
// https://pieterprespective.github.io/letter-tracer/
// The `base` must match the repo name so asset URLs resolve correctly.
export default defineConfig({
  base: '/letter-tracer/',
  test: {
    // Engine/geometry/model logic is pure and DOM-free, so the default
    // Node environment is enough — no jsdom, which keeps the suite fast.
    // Screens that touch the DOM can opt into 'jsdom' per-file via a
    // `// @vitest-environment jsdom` comment when those tests arrive.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
