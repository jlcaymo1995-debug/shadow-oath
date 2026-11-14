// Service worker registration. Production only — in dev the SW would cache the
// Vite dev server and serve stale modules after every edit.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
