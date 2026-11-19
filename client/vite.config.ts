/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Sub-path for static hosting, e.g. VITE_BASE=/queuedesk/ for GitHub Pages project sites.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Same-origin /api calls in dev: no CORS or env setup needed.
    proxy: { '/api': 'http://localhost:4000' },
  },
  preview: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
