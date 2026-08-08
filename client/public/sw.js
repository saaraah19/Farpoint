// Farpoint service worker — handles push notifications only. Deliberately
// does not cache/serve app assets (no offline mode): with Vite's hashed
// build filenames, a caching strategy needs careful invalidation to avoid
// serving stale JS after a deploy, which is a correctness risk not worth
// taking on just to get push working. This file's only job is: receive a
// push while the page isn't open, and show a notification for it.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Farpoint 🐾', body: '' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/paw-icon.svg',
      badge: '/paw-icon.svg',
      tag: 'farpoint-push',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
