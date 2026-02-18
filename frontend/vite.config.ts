// https://vite.dev/config/
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const getGitShortSha = (): string => {
  const fromEnv = String(process.env.GITHUB_SHA || '').trim();
  if (fromEnv) return fromEnv.slice(0, 7);

  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

const buildDateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
const appVersion = String(process.env.VITE_APP_VERSION || '').trim();
const explicitReleaseLabel = String(process.env.VITE_RELEASE_LABEL || '').trim();
const gitShortSha = getGitShortSha();
const fallbackReleaseLabel = appVersion
  ? `${appVersion}${gitShortSha ? ` · ${gitShortSha}` : ''}`
  : `build ${buildDateLabel}${gitShortSha ? ` · ${gitShortSha}` : ''}`;
const resolvedReleaseLabel = explicitReleaseLabel || fallbackReleaseLabel;

export default defineConfig({
  define: {
    'import.meta.env.VITE_RELEASE_LABEL': JSON.stringify(resolvedReleaseLabel),
  },
  plugins: [
    react(),
    VitePWA({
      // A gente registra via `virtual:pwa-register` para mostrar "Atualizacao disponivel" no app.
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: [
        'offline.html',
        'favicon.ico',
        'favicon-32-20260210.png',
        'apple-touch-icon-20260210.png',
        'icon-192-20260210.png',
        'icon-512-20260210.png',
      ],
      manifest: false, // Usar manifest.json existente
      workbox: {
        // Com `registerType: prompt`, o SW fica em "waiting" ate o usuario aceitar atualizar.
        clientsClaim: true,
        skipWaiting: false,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Mantemos os arquivos antigos no servidor por compatibilidade,
        // mas evitamos precache para nao inflar o SW.
        globIgnores: [
          // Splash screens sao pesadas e o iOS costuma cachear fora do SW; deixar via cache HTTP.
          '**/splash/**',
          // Manifest deve sempre revalidar (Nginx controla Cache-Control).
          '**/manifest.json',
          '**/apple-touch-icon.png',
          '**/favicon-32.png',
          '**/icon-192.png',
          '**/icon-512.png',
        ],
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
            urlPattern:
              /^(?!.*(?:icon-|favicon|apple-touch-icon|splash)).*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
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
