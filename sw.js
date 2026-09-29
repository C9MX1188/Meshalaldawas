/*
  sw.js — Service Worker بسيط لصفحة مشعل الدواس
  --------------------------------------------------
  الهدف: أن تفتح الصفحة بسرعة عند الزيارة الثانية، وأن تعمل بلا إنترنت.

  الاستراتيجية:
  • ملفات الصفحة الأساسية (HTML/CSS/JS/صور): "Stale While Revalidate"
    → نعرض النسخة المخزّنة فوراً ونحدّثها في الخلفية.
  • أي طلب خارجي (خطوط Google، عدّاد الزيارات، Formspree): نمرّره للشبكة مباشرة
    بدون تخزين حتى لا نُقدّم بيانات قديمة أو نكسر الإرسال.
*/

const CACHE_VERSION = 'meshal-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './interactions.js',
  './logo-32.png',
  './logo-68.png',
  './logo-256.png',
  './manifest.webmanifest',
  './offline.html',
];

/* التثبيت: نخزّن الملفات الأساسية */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => { /* فشل تخزين أحد الملفات لا يمنع التثبيت */ })
  );
});

/* التفعيل: نحذف أي نسخة قديمة من الكاش */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  /* نتعامل فقط مع GET من نفس الأصل */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; /* خطوط/عدّاد/Formspree → الشبكة مباشرة */

  /* صفحات التصفّح: شبكة أولاً، ثم الكاش، ثم صفحة عدم الاتصال */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./offline.html')))
    );
    return;
  }

  /* بقية الملفات: من الكاش فوراً + تحديث في الخلفية */
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
