import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from '@cloudflare/vite-plugin'
import { foldkit } from '@foldkit/vite-plugin'

import { RUNWAY_WARNING_DAYS, editionNumberFor } from './shared/edition.ts'
import facts from './worker/facts.json' with { type: 'json' }

const BACKGROUND = '#FFFFFF'

export default defineConfig({
  plugins: [
    foldkit(),
    cloudflare(),
    factRunway(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Origin',
        short_name: 'Origin',
        description:
          'One question a day about where everyday words and things come from.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: BACKGROUND,
        background_color: BACKGROUND,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,webmanifest}',
          '**/newsreader-latin-opsz-*.woff2',
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'origin-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 400 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})

/** Warns on every build, and so every deploy, when the facts are about to run out. */
function factRunway(): Plugin {
  return {
    name: 'origin:fact-runway',
    apply: 'build',
    buildStart() {
      if (this.environment.name !== 'client') {
        return
      }
      const now = new Date()
      const today = editionNumberFor({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      })
      const left = facts.length - today
      if (left < RUNWAY_WARNING_DAYS) {
        this.warn(
          `Only ${Math.max(0, left)} facts left after today (${facts.length} in worker/facts.json). Add more before readers see "Back tomorrow".`,
        )
      }
    },
  }
}
