import { defineConfig } from 'vitest/config'

// Test config kept separate from vite.config.ts so the Vite instance bundled
// with Vitest doesn't clash with vite-plugin-pwa's Vite plugin types.
export default defineConfig({
  test: {
    // Engine/geometry/model logic is pure and DOM-free, so Node is enough.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
