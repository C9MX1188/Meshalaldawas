document.addEventListener('DOMContentLoaded', () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) ظهور الأقسام عند التمرير */
  const sections = document.querySelectorAll('section');
  sections.forEach((el) => el.classList.add('reveal'));

  if (!prefersReduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    sections.forEach((el) => observer.observe(el));
  } else {
    // لو المتصفح ما يدعم المراقبة أو المستخدم مفعّل تقليل الحركة: أظهر كل شيء فوراً
    sections.forEach((el) => el.classList.add('is-visible'));
  }

  /* 2) تأثير اللمس/الضغط على مربعات المهارات */
  const chips = document.querySelectorAll('.chip');

  chips.forEach((chip) => {
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('role', 'button');

    chip.addEventListener('click', (event) => {
      chip.classList.toggle('active');

      if (prefersReduced) return; // بدون نبضة بصرية إذا كان تقليل الحركة مفعّلاً

      const rect = chip.getBoundingClientRect();
      const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left;
      const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top;

      const ping = document.createElement('span');
      ping.className = 'chip-ping';
      ping.style.left = `${x}px`;
      ping.style.top = `${y}px`;
      chip.appendChild(ping);

      ping.addEventListener('animationend', () => ping.remove());
    });

    chip.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        chip.click();
      }
    });
  });

  /* 3) فتح/إغلاق سلس لمجموعات الشهادات (details) عبر Web Animations API */
  function makeAnimatable(details) {
    const summary = details.querySelector('summary');
    if (!summary) return;

    let animation = null;
    let isClosing = false;
    let isExpanding = false;

    summary.addEventListener('click', (event) => {
      event.preventDefault();

      if (prefersReduced) {
        details.open = !details.open;
        return;
      }

      details.style.overflow = 'hidden';

      if (isClosing || !details.open) {
        openDetails();
      } else if (isExpanding || details.open) {
        shrinkDetails();
      }
    });

    function shrinkDetails() {
      isClosing = true;
      const startHeight = `${details.offsetHeight}px`;
      const endHeight = `${summary.offsetHeight}px`;

      if (animation) animation.cancel();

      animation = details.animate(
        { height: [startHeight, endHeight] },
        { duration: 220, easing: 'ease-out' }
      );

      animation.onfinish = () => onAnimationFinish(false);
      animation.oncancel = () => { isClosing = false; };
    }

    function openDetails() {
      details.style.height = `${details.offsetHeight}px`;
      details.open = true;
      window.requestAnimationFrame(() => expandDetails());
    }

    function expandDetails() {
      isExpanding = true;
      const startHeight = `${details.offsetHeight}px`;
      const endHeight = `${summary.offsetHeight + details.querySelector('.cert-list').offsetHeight}px`;

      if (animation) animation.cancel();

      animation = details.animate(
        { height: [startHeight, endHeight] },
        { duration: 220, easing: 'ease-out' }
      );

      animation.onfinish = () => onAnimationFinish(true);
      animation.oncancel = () => { isExpanding = false; };
    }

    function onAnimationFinish(open) {
      details.open = open;
      animation = null;
      isClosing = false;
      isExpanding = false;
      details.style.height = '';
      details.style.overflow = '';
    }
  }

  const certGroups = document.querySelectorAll('.cert-group');
  certGroups.forEach(makeAnimatable);

  /* 4) زر توسيع الكل / طي الكل */
  const toggleAllBtn = document.getElementById('toggle-all-certs');
  if (toggleAllBtn && certGroups.length) {
    toggleAllBtn.addEventListener('click', () => {
      const shouldExpand = toggleAllBtn.dataset.state !== 'expanded';

      certGroups.forEach((details) => {
        if (details.open !== shouldExpand) {
          details.querySelector('summary').click();
        }
      });

      toggleAllBtn.dataset.state = shouldExpand ? 'expanded' : 'collapsed';
      updateToggleAllLabel();
    });
  }

  function updateToggleAllLabel() {
    if (!toggleAllBtn) return;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
    const state = toggleAllBtn.dataset.state === 'expanded' ? 'collapse' : 'expand';
    toggleAllBtn.textContent = toggleAllBtn.dataset[`${lang}${state.charAt(0).toUpperCase()}${state.slice(1)}`];
  }

  /* 5) الموسيقى الخلفية: تشغيل تلقائي + تحكم بالصوت + زر إيقاف/تشغيل */
  const musicBtn = document.getElementById('music-toggle');
  const musicAudio = document.getElementById('bg-music');
  const musicVolume = document.getElementById('music-volume');

  if (musicBtn && musicAudio) {
    if (musicVolume) {
      musicAudio.volume = Number(musicVolume.value) / 100;
      musicVolume.style.setProperty('--vol', `${musicVolume.value}%`);
      musicVolume.addEventListener('input', () => {
        musicAudio.volume = Number(musicVolume.value) / 100;
        musicVolume.style.setProperty('--vol', `${musicVolume.value}%`);
      });
    }

    musicBtn.addEventListener('click', () => {
      if (musicAudio.paused) {
        musicAudio.play().catch(() => {});
      } else {
        musicAudio.pause();
      }
    });

    musicAudio.addEventListener('play', () => {
      musicBtn.classList.add('playing');
      musicBtn.setAttribute('aria-pressed', 'true');
      musicBtn.setAttribute('aria-label', 'إيقاف الموسيقى الخلفية');
    });

    musicAudio.addEventListener('pause', () => {
      musicBtn.classList.remove('playing');
      musicBtn.setAttribute('aria-pressed', 'false');
      musicBtn.setAttribute('aria-label', 'تشغيل الموسيقى الخلفية');
    });

    // محاولة تشغيل تلقائي فور تحميل الصفحة
    const tryAutoplay = () => musicAudio.play().catch(() => {});
    tryAutoplay();

    // المتصفحات تمنع التشغيل التلقائي بدون تفاعل من الزائر أحياناً،
    // فلو فشلت المحاولة الأولى، نشغّلها عند أول تفاعل (ضغطة، تمرير، لمس)
    const startOnFirstInteraction = () => {
      if (musicAudio.paused) tryAutoplay();
      ['click', 'touchstart', 'keydown', 'scroll'].forEach((evt) =>
        document.removeEventListener(evt, startOnFirstInteraction)
      );
    };
    ['click', 'touchstart', 'keydown', 'scroll'].forEach((evt) =>
      document.addEventListener(evt, startOnFirstInteraction, { once: true, passive: true })
    );
  }

  /* 6) تبديل اللغة (عربي / إنجليزي) */
  const langBtn = document.getElementById('lang-toggle');
  const translatable = document.querySelectorAll('[data-en]');
  const placeholderEls = document.querySelectorAll('[data-en-placeholder]');

  translatable.forEach((el) => {
    el.dataset.ar = el.innerHTML;
  });
  placeholderEls.forEach((el) => {
    el.dataset.arPlaceholder = el.getAttribute('placeholder');
  });

  function setLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-en', lang === 'en');

    translatable.forEach((el) => {
      el.innerHTML = lang === 'ar' ? el.dataset.ar : el.dataset.en;
    });

    placeholderEls.forEach((el) => {
      el.setAttribute(
        'placeholder',
        lang === 'ar' ? el.dataset.arPlaceholder : el.dataset.enPlaceholder
      );
    });

    if (langBtn) {
      langBtn.textContent = lang === 'ar' ? 'EN' : 'AR';
      langBtn.setAttribute(
        'aria-label',
        lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'
      );
    }

    updateToggleAllLabel();
    localStorage.setItem('site-lang', lang);
  }

  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const next = document.documentElement.lang === 'en' ? 'ar' : 'en';
      setLang(next);
    });

    const savedLang = localStorage.getItem('site-lang');
    if (savedLang === 'en') setLang('en');
  }

  /* 7) نموذج التواصل (Formspree) */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const statusEl = contactForm.querySelector('.form-status');
    const submitBtn = contactForm.querySelector('.form-submit');

    const statusText = {
      sending: { ar: 'جاري الإرسال...', en: 'Sending...' },
      success: { ar: 'تم إرسال رسالتك بنجاح، بترد عليك قريباً!', en: 'Message sent successfully — I will reply soon!' },
      error: { ar: 'صار خطأ، حاول مرة ثانية أو راسلني على الإيميل مباشرة.', en: 'Something went wrong — please try again or email me directly.' },
    };

    const currentLang = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const lang = currentLang();
      submitBtn.disabled = true;
      statusEl.textContent = statusText.sending[lang];
      statusEl.className = 'form-status';

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          statusEl.textContent = statusText.success[lang];
          statusEl.className = 'form-status success';
          contactForm.reset();
        } else {
          throw new Error('Form submission failed');
        }
      } catch (err) {
        statusEl.textContent = statusText.error[lang];
        statusEl.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
});
