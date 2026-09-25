module.exports = {
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,svg,ico,woff,woff2,ttf}',
    'manifest.json'
  ],
  // Workbox ignores node_modules by default, but Expo's web export puts
  // package fonts (Ionicons, Anton) under dist/assets/node_modules/. Without
  // them precached, icons and the meme font are missing offline.
  globIgnores: ['sw.js', 'workbox-*.js'],
  // The JS bundle carries the schedule data, so it's well past Workbox's
  // 2 MB default; anything over the limit is silently left out of the
  // precache and the app can't start offline.
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  swDest: 'dist/sw.js',
  sourcemap: false,
  navigateFallback: '/index.html',
  cleanupOutdatedCaches: true,
  skipWaiting: true,
  clientsClaim: true
};
