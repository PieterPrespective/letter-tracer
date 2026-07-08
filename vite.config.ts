import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed to GitHub Pages as a project site:
// https://pieterprespective.github.io/letter-tracer/
// `base` must match the repo name so asset URLs (and the SW scope) resolve.
// Test config lives in vitest.config.ts to avoid a Vite type-version clash.
export default defineConfig({
  base: '/letter-tracer/',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Letter Tracer',
        short_name: 'Letters',
        description: 'Nederlands letter-tracing spel voor kinderen (blokletters).',
        lang: 'nl',
        // Relative to the manifest URL under /letter-tracer/.
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fdf6e3',
        theme_color: '#fdf6e3',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything is bundled (base content is inlined; sounds are synthesised),
        // so precaching the shell makes the whole app work offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/letter-tracer/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
})
