// https://vite.dev/config/
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

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
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: 'dist/bundle-report.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
    VitePWA({
      // A gente registra via `virtual:pwa-register` para controlar o ciclo de update.
      injectRegister: false,
      registerType: 'autoUpdate',
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
        // Com `registerType: autoUpdate`, o SW ativa imediatamente e recarrega a pagina.
        clientsClaim: true,
        skipWaiting: true,
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
            // Cache apenas de endpoints publicos para evitar persistir dados autenticados no SW.
            urlPattern:
              /^https?:\/\/[^/]+\/api\/(musicians\/public-by-city\/|musicians\/public\/\d+\/|musicians\/\d+\/public_calendar\/|musicians\/all\/|musicians\/genres\/|organizations\/sponsors\/)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-public-cache',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              networkTimeoutSeconds: 6,
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            // Demais GETs de /api ficam sem cache no SW (seguranca/consistencia de sessao).
            urlPattern: /^https?:\/\/[^/]+\/api\//i,
            handler: 'NetworkOnly',
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
