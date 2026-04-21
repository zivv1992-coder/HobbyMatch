// ================================================================
//  קונקשן — Firebase Cloud Messaging Service Worker
// ================================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyC38cgju5tJk8orJhDZlXLFLuNQBcET1n8",
  authDomain:        "hobby-connection-adaca.firebaseapp.com",
  projectId:         "hobby-connection-adaca",
  storageBucket:     "hobby-connection-adaca.firebasestorage.app",
  messagingSenderId: "864875672697",
  appId:             "1:864875672697:web:298b2927ad26f5c0ff90a8"
});

const messaging = firebase.messaging();

// הצג התראה כשהאפליקציה ברקע / סגורה
messaging.onBackgroundMessage((payload) => {
  const title   = payload.notification?.title || 'שותף חדש לתחביב! 🎉';
  const options = {
    body:    payload.notification?.body || 'מצאנו לך שותף למפגש משותף!',
    icon:    '/favicon.ico',
    dir:     'rtl',
    lang:    'he',
    vibrate: [200, 100, 200],
    data:    payload.data || {},
    actions: [
      { action: 'open',    title: 'ראה פרטים' },
      { action: 'dismiss', title: 'סגור'      }
    ]
  };
  return self.registration.showNotification(title, options);
});

// לחיצה על התראה — פתח את האפליקציה
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/תחביבים/profiles.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes('profiles.html') && 'focus' in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
