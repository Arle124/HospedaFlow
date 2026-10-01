import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'HospedaSync',
        short_name: 'HospedaSync',
        display: 'standalone',
        theme_color: '#1b2230',
        background_color: '#1b2230',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor';
          if (id.includes('node_modules/dexie')) return 'db';
          if (id.includes('node_modules/framer-motion')) return 'motion';
        },
      },
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://100.84.162.38:8080',
        changeOrigin: true,
      },
    },
  },
})
