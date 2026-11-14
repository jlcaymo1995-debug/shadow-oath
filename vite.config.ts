import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

/**
 * The service worker precaches a fixed file list, but Vite emits content-hashed
 * asset names that change every build — so the shipped list never contained the
 * actual JS bundle and a first-visit-offline load would 404 on it. This rewrites
 * dist/sw.js with the real emitted names, and stamps VERSION from those names so
 * that deploying also invalidates the previous cache (it was hardcoded before,
 * meaning the old cache was never evicted).
 */
function swPrecache(): Plugin {
  return {
    name: 'sw-precache',
    apply: 'build',
    writeBundle(opts, bundle) {
      const dir = opts.dir ?? 'dist';
      const emitted = Object.keys(bundle)
        // Never the sourcemap: it is ~4.9 MB and would blow up the install step.
        .filter((f) => /\.(js|css)$/.test(f))
        .sort()
        .map((f) => './' + f);
      const files = [
        './', './index.html', './manifest.webmanifest',
        './icon-192.png', './icon-512.png', './apple-touch-icon.png',
        ...emitted,
      ];
      const version =
        'shadow-oath-' + createHash('sha1').update(files.join('|')).digest('hex').slice(0, 8);

      const swPath = resolve(dir, 'sw.js');
      const before = readFileSync(swPath, 'utf8');
      const after = before
        .replace(/const VERSION='[^']*';/, `const VERSION='${version}';`)
        .replace(/const FILES=\[[^\]]*\];/, `const FILES=${JSON.stringify(files)};`);

      if (after === before) {
        this.warn('sw-precache: VERSION/FILES not found in sw.js — precache NOT updated');
        return;
      }
      writeFileSync(swPath, after);
      console.log(`  sw.js  ${files.length} files precached  ·  ${version}`);
    },
  };
}

export default defineConfig({
  // Relative base so the build works from a domain root (Cloudflare Pages)
  // or a subpath (GitHub Pages /shadow-oath/) without reconfiguring.
  base: './',
  plugins: [swPrecache()],
  build: {
    // The game targets iOS Safari as a home-screen PWA; es2020 keeps older
    // iOS versions working rather than assuming the latest baseline.
    target: 'es2020',
    sourcemap: true,
  },
  server: { port: 5173 },
});
