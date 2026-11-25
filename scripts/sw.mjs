// Generates the offline service worker after prerendering, so every HTML page is precached.
import { generateSW } from 'workbox-build';

const { count, size, warnings } = await generateSW({
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,svg,png,webmanifest,ico}'],
  globIgnores: ['og.jpg'],
  swDest: 'dist/sw.js',
  directoryIndex: 'index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  navigateFallback: '/index.html',
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  sourcemap: false,
});
warnings.forEach((w) => console.warn(w));
console.log(`service worker precaches ${count} files (${(size / 1024).toFixed(0)} KB)`);
