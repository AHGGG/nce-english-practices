import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
const plugins = [react()]
// Only enable SSL if explicitly requested via HTTPS=true
// Default is HTTP
const useHttps = process.env.HTTPS === 'true'
if (useHttps) {
  plugins.push(basicSsl())
}

// Add PWA plugin for offline podcast playback
plugins.push(
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
    manifest: {
      name: 'NCE English Practice',
      short_name: 'NCE Practice',
      description: 'English learning platform with podcast, reading, and vocabulary',
      theme_color: '#0f0f0f',
      background_color: '#0f0f0f',
      display: 'standalone',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      // Allow offline navigation (SPA fallback)
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api/, /^\/dict/, /^\/ws/],
      
      // Cache API responses
      runtimeCaching: [
        {
          // Cache podcast episode audio files (mp3, m4a, ogg)
          urlPattern: ({ request, url }) =>
            request.destination === 'audio' ||
            url.pathname.startsWith('/api/podcast/episode/') ||
            /\.(mp3|m4a|ogg|wav)$/i.test(url.pathname),
          handler: 'CacheFirst',
          options: {
            cacheName: 'podcast-audio-cache',
            expiration: {
              maxEntries: 50, // Limit max cached episodes
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
            cacheableResponse: {
              statuses: [0, 200, 206], // Include partial content (Range requests)
            },
            rangeRequests: true, // CRITICAL: Enable Range Request support for seeking
          },
        },
        {
          // Cache API responses (feeds, episodes list)
          urlPattern: /\/api\/podcast\/(feeds|feed\/\d+|recently-played)/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'podcast-api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 24 * 60 * 60, // 1 day
            },
          },
        },
        {
          // Cache podcast images
          urlPattern: /\.(jpg|jpeg|png|gif|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            },
          },
        },
      ],
    },
  })
)

// Backend target protocol should match frontend mode usually,
// or default to HTTP if not specified.
// However, if we run frontend in HTTPS, we likely want backend in HTTPS too.
// Let's default target to http, but allow override or switch based on usage.
// Actually, for simplicity, let's assume if frontend is HTTPS, backend is also HTTPS.
const targetProtocol = useHttps ? 'https' : 'http'
const targetBase = process.env.VITE_API_TARGET || `${targetProtocol}://127.0.0.1:8000`

export default defineConfig({
  plugins: plugins,
  server: {
    host: true, // Listen on all addresses (0.0.0.0)
    https: useHttps, // Enable/Disable HTTPS server
    proxy: {
      '/api': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/dict': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
      },
      '/aui/stream': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
      },
      '/aui/render': {
        target: targetBase,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: targetBase.replace('http', 'ws'),
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
