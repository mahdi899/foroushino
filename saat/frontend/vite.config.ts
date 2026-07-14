import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'saat-logo.png',
        'pwa/icon-192.png',
        'pwa/icon-512.png',
        'pwa/maskable-512.png',
        'avatars/**/*',
      ],
      manifest: {
        name: 'سات — هر تماس، یک فرصت فروش',
        short_name: 'سات',
        description: 'اپلیکیشن فروش تلفنی سات',
        theme_color: '#006F75',
        background_color: '#006F75',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'fa',
        scope: './',
        start_url: './',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2,webp}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/telegram\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'telegram-sdk',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/android/**', '**/dev-dist/**'],
    },
  },
  optimizeDeps: {
    entries: [path.resolve(__dirname, 'index.html')],
    exclude: ['virtual:pwa-register'],
  },
})
