// ══════════════════════════════════════════════════════════════════════════════
// sw.js — Connection PWA Service Worker
// Handles: asset caching, offline fallback, push notifications
// ══════════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'connection-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/profiles.html',
  '/register.html',
  '/offline.html',
  '/manifest.json',
  '/config.js',
  '/auth.js',
  '/firebase-logic.js',
  '/ui-render.js',
  '/tourSteps.js',
  '/js/profiles-boot.js',
  '/js/profiles-ui.js',
  '/js/profiles-pwa.js',
  '/js/profiles-state.js',
  '/js/profiles-utils.js',
  '/js/profiles-matches.js',
  '/js/profiles-events.js',
  '/js/profiles-chat.js',
  '/js/profiles-notifications.js',
  '/js/profiles-edit-profile.js',
];

// CDN origins that should always be fetched from network
const CDN_ORIGINS = [
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com',
  'https://cdn.jsdelivr.net',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// ── Install: pre-cache all app shell assets ───────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for same-origin, network-only for CDN ─────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and CDN requests
  if (request.method !== 'GET') return;
  if (CDN_ORIGINS.some(origin => request.url.startsWith(origin))) return;
  // Skip Firestore / Firebase API calls
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('firebaseio')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          // Cache same-origin successful responses
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'קונקשן', body: 'יש לך עדכון חדש! 🤝', url: '/profiles.html' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      dir: 'rtl',
      lang: 'he',
      data: { url: data.url || '/hobby-match/profiles.html' },
    })
  );
});

// ── Notification click: open or focus the app ─────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/profiles.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
