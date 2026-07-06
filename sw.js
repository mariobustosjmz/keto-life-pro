// KetoLife Pro — Service Worker (ES5-compatible, Cache-First + Network-First)
'use strict';

var CACHE_NAME = 'ketolife-v1';

// Static assets used by the app shell (Cache-First)
// Relative paths so the precache works under any subpath (e.g. GitHub Pages /keto-life-pro/).
var STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/dashboard.css',
  './css/habits.css',
  './css/meals.css',
  './js/time.js',
  './js/db.js',
  './js/notifications.js',
  './js/data/i18n.js',
  './js/data/keto-foods.js',
  './js/components/meals.js',
  './js/components/dashboard.js',
  './js/components/habits.js',
  './js/components/foods.js',
  './js/components/more.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.svg'
];

// Precache static assets on install
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).then(function () {
        return self.skipWaiting();
      });
    }).catch(function (err) {
      console.error('[SW] Fallo al precachear:', err);
      return self.skipWaiting();
    })
  );
});

// Clean old caches and take control on activate
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (name) {
          return name !== CACHE_NAME;
        }).map(function (name) {
          return caches.delete(name);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Decide if a request is part of the static app shell
function isStaticAsset(request) {
  var url = new URL(request.url);
  var path = url.pathname;
  // Strip the GitHub Pages repo subpath if present, then compare to relative assets.
  var repoPath = '/keto-life-pro/';
  var localPath = path;
  if (path.indexOf(repoPath) === 0) {
    localPath = path.substring(repoPath.length - 1);
  }
  return STATIC_ASSETS.some(function (asset) {
    return localPath === asset || path.indexOf(asset) !== -1;
  });
}

// Fetch handler: Cache-First for static assets, Network-First for dynamic data,
// with offline fallback to cached index.html for navigation requests.
self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Ignore non-GET and non-HTTP(S) requests
  if (request.method !== 'GET' || !/^https?:\/\//.test(request.url)) {
    return;
  }

  // Cache-First for static app assets
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(function (networkResponse) {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-First for navigation/data, falling back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match('index.html').then(function (cachedResponse) {
          return cachedResponse || caches.match('/').then(function (rootResponse) {
            return rootResponse;
          });
        });
      })
    );
    return;
  }

  // Default: stale-while-revalidate for other same-origin requests
  event.respondWith(
    caches.match(request).then(function (cachedResponse) {
      var fetchPromise = fetch(request).then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function () {
        return undefined;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
