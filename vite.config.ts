import { defineConfig } from 'vite';

// base './' permite publicar em qualquer subpasta (GitHub Pages, itch.io, Netlify...)
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
});
