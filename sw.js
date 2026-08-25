const VERSION = '20260825-e';
const CACHE = 'xinyi-' + VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isNav =
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('manifest.webmanifest');

  if (isNav) {
    // 网络优先：联网时总是拉最新版；断网才退回缓存
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp));
          return resp;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
    );
  } else {
    // 静态资源：缓存优先 + 后台刷新
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const net = fetch(e.request)
          .then((resp) => {
            const cp = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, cp));
            return resp;
          })
          .catch(() => {});
        return cached || net;
      })
    );
  }
});

// 每日提醒（渐进增强）：后台周期性同步时弹一条通知，提醒打卡/背词
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'daily-reminder') {
    e.waitUntil(
      self.registration.showNotification('欣怡单词星球', {
        body: '今天还没打卡哦，来背几个单词吧 🔥',
        icon: './icon-192.png',
        badge: './icon-192.png'
      })
    );
  }
});
