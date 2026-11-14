import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from a domain root (Cloudflare Pages)
  // or a subpath (GitHub Pages /shadow-oath/) without reconfiguring.
  base: './',
  build: {
    // The game targets iOS Safari as a home-screen PWA; es2020 keeps older
    // iOS versions working rather than assuming the latest baseline.
    target: 'es2020',
    sourcemap: true,
  },
  server: { port: 5173 },
});
