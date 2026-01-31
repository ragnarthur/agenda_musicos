import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
