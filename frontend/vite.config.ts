// https://vite.dev/config/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-32.png', 'icon-192.png', 'icon-512.png'],
      manifest: false, // Usar manifest.json existente
      workbox: {
        // Garantir que a atualização do SW entra em vigor sem precisar fechar todas as abas.
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/gf-secure-admin\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Exclui ícones PWA e splash screens (já gerenciados pelo precache com revision hashes)
            urlPattern: /^(?!.*(?:icon-|favicon|apple-touch-icon|splash)).*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Desabilitar em dev para evitar conflitos
      },
    }),
  ],
  resolve: {
    alias: {
      'lottie-web': 'lottie-web/build/player/esm/lottie_light.min.js',
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['date-fns', 'lucide-react'],
          animations: ['framer-motion'],
          swr: ['swr'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
