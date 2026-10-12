import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024, // 30 MB to comfortably precache model shards
        globPatterns: ['**/*.{js,css,html,png,json,bin}']
      },
      manifest: {
        name: 'Crop Health - Offline AI',
        short_name: 'CropHealth',
        description: 'Offline-First Edge AI Plant Disease Detection with Weather Risk Assessment',
        theme_color: '#2e7d32',
        background_color: '#f5f5f5',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'node'
  }
});
