
const CACHE_NAME = 'istoic-cache-v25';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming messages from the main app (IStokView) to trigger System Notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data.payload;
    
    self.registration.showNotification(title, {
      body: body,
      icon: 'https://grainy-gradients.vercel.app/noise.svg', // Menggunakan icon app
      badge: 'https://grainy-gradients.vercel.app/noise.svg',
      vibrate: [100, 50, 100],
      tag: tag, // Tag memastikan notifikasi dari orang yang sama menumpuk, tidak spam baris baru
      renotify: true,
      data: data, // Menyimpan PeerID untuk deep linking saat diklik
      actions: [
        { action: 'open', title: 'Buka Chat' },
        { action: 'reply', title: 'Balas' }
      ]
    });
  }
});

// Handle Notification Click (Mulus & Pintar)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Ambil URL root atau URL spesifik chat jika ada
  const urlToOpen = new URL(self.location.origin).href;
  const targetPeerId = event.notification.data ? event.notification.data.peerId : null;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Coba cari window yang sudah terbuka
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(urlToOpen) && 'focus' in client) {
          // Jika ketemu, fokuskan window tersebut
          if (targetPeerId) {
            // Kirim pesan ke window untuk pindah ke chat ID tersebut
            client.postMessage({ type: 'NAVIGATE_CHAT', peerId: targetPeerId });
          }
          return client.focus();
        }
      }
      // 2. Jika tidak ada yang terbuka, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen + (targetPeerId ? `/#connect=${targetPeerId}` : ''));
      }
    })
  );
});
