/*
  register-sw.js
  ----------------
  تسجيل الـ Service Worker حتى تفتح الصفحة بسرعة في الزيارات التالية وتعمل بلا إنترنت.

  ملاحظات مهمة:
  • لا يعمل إلا على HTTPS أو localhost — هذا قيد من المتصفح نفسه، وليس خطأ في الكود.
  • نسجّله بعد تحميل الصفحة (load) حتى لا يزاحم تحميل المحتوى الأساسي.
  • عند نزول نسخة جديدة من الملفات نُعلم الزائر بلطف بدل إجباره على التحديث.
*/

(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  /* file:// لا يدعم Service Workers — نتجنّب رمي خطأ في الـ console أثناء التطوير المحلي */
  if (window.location.protocol === 'file:') return;

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('sw.js')
      .then(function (registration) {
        registration.addEventListener('updatefound', function () {
          var incoming = registration.installing;
          if (!incoming) return;

          incoming.addEventListener('statechange', function () {
            /* نسخة جديدة جاهزة وهناك نسخة قديمة تعمل حالياً */
            if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast();
            }
          });
        });
      })
      .catch(function () {
        /* فشل التسجيل لا يؤثر على عمل الصفحة — نتجاهله بهدوء */
      });
  });

  function showUpdateToast() {
    var toast = document.getElementById('toast');
    var isEn = document.documentElement.lang === 'en';
    var message = isEn
      ? 'A new version is available — refresh to update.'
      : 'صدرت نسخة محدَّثة من الصفحة — حدّث الصفحة لرؤيتها.';

    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 5000);
  }
})();
