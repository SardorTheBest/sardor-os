const CACHE_NAME = 'zenith-pwa-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// In-memory SW reminder registry
let activeReminders = [];
let checkIntervalId = null;

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      startReminderChecker();
      return self.clients.claim();
    })
  );
});

// Start background interval to check for due reminders
function startReminderChecker() {
  if (checkIntervalId) clearInterval(checkIntervalId);
  checkIntervalId = setInterval(() => {
    checkAndTriggerReminders();
  }, 20000);
}

// Check all pending scheduled reminders
async function checkAndTriggerReminders() {
  const now = Date.now();
  const due = activeReminders.filter((r) => !r.fired && r.scheduledTime <= now);

  for (const reminder of due) {
    reminder.fired = true;
    try {
      await self.registration.showNotification(reminder.title, {
        body: reminder.body,
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: reminder.tag || reminder.id,
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        data: {
          targetView: reminder.type === 'habit' ? 'habits' : 'tasks',
          targetId: reminder.targetId,
          url: '/',
        },
      });

      // Notify all open client tabs so they can play sound or update state
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({
          type: 'REMINDER_TRIGGERED',
          reminder,
        });
      }
    } catch (err) {
      console.warn('[SW] showNotification error:', err);
    }
  }

  // Purge old fired reminders (older than 1 hour)
  activeReminders = activeReminders.filter((r) => !r.fired || r.scheduledTime > now - 3600000);
}

// Handle messages from client tabs
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SYNC_REMINDERS') {
    if (Array.isArray(data.reminders)) {
      activeReminders = data.reminders;
      checkAndTriggerReminders();
    }
  } else if (data.type === 'SCHEDULE_REMINDER') {
    if (data.reminder) {
      const idx = activeReminders.findIndex((r) => r.id === data.reminder.id);
      if (idx >= 0) {
        activeReminders[idx] = data.reminder;
      } else {
        activeReminders.push(data.reminder);
      }
      checkAndTriggerReminders();
    }
  } else if (data.type === 'CANCEL_REMINDER') {
    activeReminders = activeReminders.filter((r) => r.targetId !== data.targetId && r.id !== data.id);
  } else if (data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('🔔 Zing OS • Тест Push', {
      body: 'Фоновые Push-уведомления Service Worker работают автономно!',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      vibrate: [200, 100, 200],
      tag: 'test-sw',
      data: { targetView: 'dashboard' },
    });
  }
});

// Handle Notification Clicks (Focus or Open App & Redirect)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetView = notificationData.targetView || 'tasks';
  const targetId = notificationData.targetId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window client is already open, focus it and post navigation message
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            targetView,
            targetId,
          });
          return;
        }
      }

      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow('/').then((newClient) => {
          if (newClient) {
            setTimeout(() => {
              newClient.postMessage({
                type: 'NOTIFICATION_CLICKED',
                targetView,
                targetId,
              });
            }, 1000);
          }
        });
      }
    })
  );
});

// Network fetch handler with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // For app navigation, return cached index or network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache and update in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.destination === 'image') {
          return caches.match('/icon-192.svg');
        }
      });
    })
  );
});
