/*
  interactions.js
  ----------------
  كل تفاعلات صفحة مشعل الدواس (JavaScript خالص — بدون أي مكتبات خارجية):

   1) ظهور تدريجي للأقسام عند التمرير (Scroll reveal) مع شبكة أمان.
   2) نبضة قياس عند الضغط على مربعات المهارات (chips).
   3) فتح/إغلاق سلس لمجموعات الشهادات (details) + زر توسيع/طي الكل.
   4) بحث فوري داخل الشهادات مع تمييز النتائج.
   5) عدّادات تلقائية: عدد الشهادات، مجموع ساعات التدريب، عدد المهارات والمشاريع.
   6) مخطط توزيع الشهادات حسب المجال.
   7) شريط التنقل: قائمة الجوال، إبراز القسم الحالي، شريط تقدم القراءة.
   8) تبديل اللغة (عربي/إنجليزي) مع حفظ الاختيار.
   9) تبديل الوضع الفاتح/الداكن مع حفظ الاختيار.
  10) الموسيقى الخلفية: تشغيل/إيقاف + مستوى الصوت (تشغيل بتفاعل المستخدم فقط).
  11) نسخ البريد/الجوال، زر العودة للأعلى، ونموذج التواصل (Formspree).

  كل تأثير يحترم إعداد «تقليل الحركة» في نظام المستخدم (prefers-reduced-motion).
*/

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const root = document.documentElement;
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReduced = reducedQuery.matches;
  reducedQuery.addEventListener('change', (e) => { prefersReduced = e.matches; });

  const currentLang = () => (root.lang === 'en' ? 'en' : 'ar');

  /* ============================================================
     أداة صغيرة: إشعار مؤقت (toast)
     ============================================================ */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  /* ============================================================
     1) ظهور الأقسام عند التمرير
     ============================================================ */
  const sections = Array.from(document.querySelectorAll('section'));
  sections.forEach((el) => el.classList.add('reveal'));

  if (!prefersReduced && 'IntersectionObserver' in window) {
    /* threshold = 0 مهم: قسم «الشهادات» أطول من الشاشة، فلو استخدمنا 0.15
       لن تتحقق النسبة أبداً ويبقى مخفياً. */
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    );
    sections.forEach((el) => revealObserver.observe(el));

    /* شبكة أمان: أظهر كل الأقسام بعد 4 ثوانٍ مهما حدث */
    window.setTimeout(() => sections.forEach((el) => el.classList.add('is-visible')), 4000);
  } else {
    sections.forEach((el) => el.classList.add('is-visible'));
  }

  /* ============================================================
     2) مربعات المهارات
     ============================================================ */
  const chips = Array.from(document.querySelectorAll('.chip'));

  const levelWords = {
    3: { ar: 'مرتاح فيها', en: 'Comfortable' },
    2: { ar: 'أتدرّب عليها', en: 'Practicing' },
    1: { ar: 'درست أساسياتها', en: 'Studied the basics' },
  };

  /* نبني نقاط المستوى ونصف الحالة لقارئ الشاشة */
  function buildLevelDots(chip) {
    const level = Number(chip.dataset.level);
    if (!level) return;
    if (chip.querySelector('.lvl-dots')) return;

    const dots = document.createElement('span');
    dots.className = 'lvl-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 1; i <= 3; i++) {
      const dot = document.createElement('i');
      if (i <= level) dot.className = 'on';
      dots.appendChild(dot);
    }
    chip.appendChild(dots);
  }

  function syncChipLabels() {
    const lang = currentLang();
    chips.forEach((chip) => {
      const level = Number(chip.dataset.level);
      if (!level) return;
      const name = (chip.childNodes[0] && chip.childNodes[0].textContent || '').trim();
      const word = levelWords[level][lang];
      chip.setAttribute('title', name + ' — ' + word);
      chip.setAttribute('aria-label', name + ' — ' + word);
    });
  }

  chips.forEach((chip) => {
    buildLevelDots(chip);
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-pressed', 'false');

    chip.addEventListener('click', (event) => {
      const on = chip.classList.toggle('active');
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');

      if (prefersReduced) return;

      const rect = chip.getBoundingClientRect();
      const x = (event.clientX || rect.left + rect.width / 2) - rect.left;
      const y = (event.clientY || rect.top + rect.height / 2) - rect.top;

      const ping = document.createElement('span');
      ping.className = 'chip-ping';
      ping.style.left = x + 'px';
      ping.style.top = y + 'px';
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

  /* ============================================================
     3) مجموعات الشهادات: فتح/إغلاق سلس
     ============================================================ */
  const certGroups = Array.from(document.querySelectorAll('.cert-group'));

  function makeAnimatable(details) {
    const summary = details.querySelector('summary');
    const list = details.querySelector('.cert-list');
    if (!summary || !list) return;

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
      if (isClosing || !details.open) openDetails();
      else shrinkDetails();
    });

    function shrinkDetails() {
      isClosing = true;
      const startHeight = details.offsetHeight + 'px';
      const endHeight = summary.offsetHeight + 'px';
      if (animation) animation.cancel();
      animation = details.animate({ height: [startHeight, endHeight] }, { duration: 220, easing: 'ease-out' });
      animation.onfinish = () => finish(false);
      animation.oncancel = () => { isClosing = false; };
    }

    function openDetails() {
      details.style.height = details.offsetHeight + 'px';
      details.open = true;
      window.requestAnimationFrame(expandDetails);
    }

    function expandDetails() {
      isExpanding = true;
      const startHeight = details.offsetHeight + 'px';
      const endHeight = (summary.offsetHeight + list.offsetHeight) + 'px';
      if (animation) animation.cancel();
      animation = details.animate({ height: [startHeight, endHeight] }, { duration: 220, easing: 'ease-out' });
      animation.onfinish = () => finish(true);
      animation.oncancel = () => { isExpanding = false; };
    }

    function finish(open) {
      details.open = open;
      animation = null;
      isClosing = false;
      isExpanding = false;
      details.style.height = '';
      details.style.overflow = '';
    }
  }

  certGroups.forEach(makeAnimatable);

  /* زر توسيع الكل / طي الكل */
  const toggleAllBtn = document.getElementById('toggle-all-certs');

  function updateToggleAllLabel() {
    if (!toggleAllBtn) return;
    const lang = currentLang();
    const expanded = toggleAllBtn.dataset.state === 'expanded';
    const key = lang + (expanded ? 'Collapse' : 'Expand');
    toggleAllBtn.textContent = toggleAllBtn.dataset[key] || toggleAllBtn.textContent;
  }

  if (toggleAllBtn && certGroups.length) {
    toggleAllBtn.setAttribute('aria-expanded', 'false');
    toggleAllBtn.addEventListener('click', () => {
      const shouldExpand = toggleAllBtn.dataset.state !== 'expanded';
      certGroups.forEach((details) => {
        if (details.hidden) return;
        if (details.open !== shouldExpand) details.querySelector('summary').click();
      });
      toggleAllBtn.dataset.state = shouldExpand ? 'expanded' : 'collapsed';
      toggleAllBtn.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');
      updateToggleAllLabel();
    });
  }

  /* ============================================================
     4) + 5) + 6) إحصاءات الشهادات، المخطط، والبحث
     ============================================================ */
  const certItems = Array.from(document.querySelectorAll('.cert-item'));

  /* تحويل نص المدة الإنجليزي "3h 37m" إلى دقائق */
  function durationToMinutes(item) {
    const durEl = item.querySelector('.cert-meta .dur');
    if (!durEl) return 0;
    const text = durEl.dataset.en || durEl.textContent || '';
    let minutes = 0;
    const h = text.match(/(\d+)\s*h/i);
    const m = text.match(/(\d+)\s*m/i);
    if (h) minutes += parseInt(h[1], 10) * 60;
    if (m) minutes += parseInt(m[1], 10);
    return minutes;
  }

  const totalMinutes = certItems.reduce((sum, item) => sum + durationToMinutes(item), 0);
  const totalHours = Math.round(totalMinutes / 60);

  /* عدّادات حقيقية محسوبة من DOM — لا أرقام مكتوبة يدوياً تتعارض مع المحتوى */
  const certTotalEl = document.getElementById('cert-total');
  const certHoursEl = document.getElementById('cert-hours');
  if (certTotalEl) certTotalEl.textContent = String(certItems.length);
  if (certHoursEl) certHoursEl.textContent = String(totalHours);

  /* تصحيح أعداد كل مجموعة تلقائياً */
  certGroups.forEach((group) => {
    const countEl = group.querySelector('summary .count');
    const n = group.querySelectorAll('.cert-item').length;
    if (countEl) countEl.textContent = String(n);
    group.dataset.total = String(n);
  });

  /* مخطط التوزيع */
  const chartEl = document.getElementById('cert-chart');
  if (chartEl && certGroups.length) {
    const maxCount = Math.max.apply(null, certGroups.map((g) => Number(g.dataset.total) || 0));

    certGroups.forEach((group) => {
      const labelSource = group.querySelector('summary span:first-child');
      const count = Number(group.dataset.total) || 0;

      const row = document.createElement('div');
      row.className = 'cert-bar';

      const label = document.createElement('span');
      label.className = 'cert-bar-label';
      label.textContent = labelSource ? labelSource.textContent : '';
      if (labelSource && labelSource.dataset.en) label.dataset.en = labelSource.dataset.en;

      const track = document.createElement('span');
      track.className = 'cert-bar-track';
      const fill = document.createElement('span');
      fill.className = 'cert-bar-fill';
      fill.dataset.target = maxCount ? Math.round((count / maxCount) * 100) + '%' : '0%';
      track.appendChild(fill);

      const value = document.createElement('span');
      value.className = 'cert-bar-value';
      value.textContent = String(count);

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      chartEl.appendChild(row);
    });

    const fills = Array.from(chartEl.querySelectorAll('.cert-bar-fill'));
    const paintBars = () => fills.forEach((f) => { f.style.width = f.dataset.target; });

    if (!prefersReduced && 'IntersectionObserver' in window) {
      const chartObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { paintBars(); chartObserver.disconnect(); }
        });
      }, { threshold: 0.2 });
      chartObserver.observe(chartEl);
      window.setTimeout(paintBars, 3500);
    } else {
      paintBars();
    }
  }

  /* أرقام الهيرو */
  function animateNumber(el, target) {
    if (!el) return;
    if (prefersReduced) { el.textContent = String(target); return; }
    const duration = 1100;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    const targets = [
      [document.getElementById('stat-certs'), certItems.length],
      [document.getElementById('stat-hours'), totalHours],
      [document.getElementById('stat-projects'), document.querySelectorAll('.project-card').length],
      [document.getElementById('stat-skills'), document.querySelectorAll('#skills .chip').length],
    ];
    targets.forEach(([el, n]) => { if (el) el.textContent = '0'; });

    const runStats = () => targets.forEach(([el, n]) => animateNumber(el, n));
    if ('IntersectionObserver' in window) {
      const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { runStats(); statsObserver.disconnect(); }
        });
      }, { threshold: 0.3 });
      statsObserver.observe(heroStats);
    } else {
      runStats();
    }
  }

  /* البحث في الشهادات */
  const certSearch = document.getElementById('cert-search');
  const certSearchStatus = document.getElementById('cert-search-status');

  /* نحفظ النص الأصلي لكل عنوان/جهة حتى نتمكن من إزالة التمييز لاحقاً */
  const searchTargets = certItems.map((item) => {
    const titleEl = item.querySelector('.cert-main h3');
    const issuerEl = item.querySelector('.cert-main .issuer');
    return { item, titleEl, issuerEl };
  });

  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function clearHighlight(el) {
    if (!el) return;
    if (el.dataset.plain !== undefined) {
      el.textContent = el.dataset.plain;
      delete el.dataset.plain;
    }
  }

  function highlight(el, query) {
    if (!el) return;
    const plain = el.dataset.plain !== undefined ? el.dataset.plain : el.textContent;
    el.dataset.plain = plain;
    const re = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
    el.textContent = '';
    let last = 0;
    let match;
    while ((match = re.exec(plain)) !== null) {
      if (match.index > last) el.appendChild(document.createTextNode(plain.slice(last, match.index)));
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      el.appendChild(mark);
      last = match.index + match[0].length;
      if (re.lastIndex === match.index) re.lastIndex++;
    }
    if (last < plain.length) el.appendChild(document.createTextNode(plain.slice(last)));
  }

  function itemText(entry) {
    const title = entry.titleEl ? (entry.titleEl.dataset.plain !== undefined ? entry.titleEl.dataset.plain : entry.titleEl.textContent) : '';
    const titleEn = entry.titleEl && entry.titleEl.dataset.en ? entry.titleEl.dataset.en : '';
    const issuer = entry.issuerEl ? (entry.issuerEl.dataset.plain !== undefined ? entry.issuerEl.dataset.plain : entry.issuerEl.textContent) : '';
    const issuerEn = entry.issuerEl && entry.issuerEl.dataset.en ? entry.issuerEl.dataset.en : '';
    return (title + ' ' + titleEn + ' ' + issuer + ' ' + issuerEn).toLowerCase();
  }

  /* ---- أزرار تصفية المجالات ---- */
  const filtersEl = document.getElementById('cert-filters');
  let activeCategory = 'all'; /* 'all' أو فهرس المجموعة */

  if (filtersEl && certGroups.length) {
    const makeFilter = (labelText, labelEn, count, value) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cert-filter';
      btn.dataset.filter = value;
      btn.setAttribute('aria-pressed', value === 'all' ? 'true' : 'false');

      const text = document.createElement('span');
      text.textContent = labelText;
      if (labelEn) text.dataset.en = labelEn;

      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(count);

      btn.appendChild(text);
      btn.appendChild(n);
      return btn;
    };

    filtersEl.appendChild(makeFilter('الكل', 'All', certItems.length, 'all'));
    certGroups.forEach((group, i) => {
      const src = group.querySelector('summary span:first-child');
      group.dataset.index = String(i);
      filtersEl.appendChild(
        makeFilter(src ? src.textContent : '', src ? src.dataset.en : '', Number(group.dataset.total) || 0, String(i))
      );
    });

    filtersEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.cert-filter');
      if (!btn) return;
      activeCategory = btn.dataset.filter;
      Array.from(filtersEl.querySelectorAll('.cert-filter')).forEach((b) => {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      applyCertView();
    });
  }

  /* ---- الترتيب ---- */
  const certSortSelect = document.getElementById('cert-sort');

  function itemDate(item) {
    const d = item.querySelector('.cert-meta .date');
    return d ? d.textContent.trim() : '';
  }
  function itemTitle(item) {
    const h = item.querySelector('.cert-main h3');
    if (!h) return '';
    return (h.dataset.plain !== undefined ? h.dataset.plain : h.textContent).trim();
  }

  function applySort(mode) {
    certGroups.forEach((group) => {
      const list = group.querySelector('.cert-list');
      if (!list) return;
      const items = Array.from(list.querySelectorAll('.cert-item'));
      items.sort((a, b) => {
        switch (mode) {
          case 'date-asc': return itemDate(a).localeCompare(itemDate(b));
          case 'hours-desc': return durationToMinutes(b) - durationToMinutes(a);
          case 'title-asc': return itemTitle(a).localeCompare(itemTitle(b), undefined, { sensitivity: 'base' });
          case 'date-desc':
          default: return itemDate(b).localeCompare(itemDate(a));
        }
      });
      const frag = document.createDocumentFragment();
      items.forEach((it) => frag.appendChild(it));
      list.appendChild(frag);
    });
  }

  /* ---- رسالة لا توجد نتائج ---- */
  const certEmpty = document.createElement('p');
  certEmpty.className = 'cert-empty';
  certEmpty.id = 'cert-empty';
  const certSection = document.getElementById('certificates');
  if (certSection) certSection.appendChild(certEmpty);

  /* ---- المحرّك الموحّد: تصفية + بحث + عدّادات ---- */
  function applyCertView() {
    const rawQuery = certSearch ? certSearch.value : '';
    const query = rawQuery.trim();
    const q = query.toLowerCase();

    /* نظّف التمييز دائماً قبل إعادة الرسم */
    searchTargets.forEach((entry) => {
      clearHighlight(entry.titleEl);
      clearHighlight(entry.issuerEl);
    });

    let matches = 0;

    certGroups.forEach((group) => {
      const inCategory = activeCategory === 'all' || group.dataset.index === activeCategory;
      let visible = 0;

      Array.from(group.querySelectorAll('.cert-item')).forEach((item) => {
        const entry = searchTargets.find((t) => t.item === item);
        const textHit = !q || (entry && itemText(entry).indexOf(q) !== -1);
        const show = inCategory && textHit;
        item.hidden = !show;
        if (show) {
          visible++;
          matches++;
          if (q && entry) {
            highlight(entry.titleEl, query);
            highlight(entry.issuerEl, query);
          }
        }
      });

      group.hidden = visible === 0;
      const countEl = group.querySelector('summary .count');
      if (countEl) countEl.textContent = String(visible);

      /* افتح تلقائياً عند وجود بحث/تصفية نشطة حتى تظهر النتائج مباشرة */
      const shouldAutoOpen = (q || activeCategory !== 'all') && visible > 0;
      if (shouldAutoOpen && !group.open) {
        group.open = true;
        group.style.height = '';
        group.style.overflow = '';
      }
    });

    /* الحالة النصية */
    const lang = currentLang();
    const filtering = q || activeCategory !== 'all';
    if (certSearchStatus) {
      if (!filtering) certSearchStatus.textContent = '';
      else certSearchStatus.textContent = lang === 'en'
        ? (matches ? matches + ' matching certificate(s)' : '')
        : (matches ? 'عدد النتائج: ' + matches : '');
    }

    certEmpty.classList.toggle('is-visible', filtering && matches === 0);
    certEmpty.textContent = lang === 'en'
      ? 'No certificates match your search or filter.'
      : 'لا توجد شهادات مطابقة لبحثك أو التصفية المختارة.';

    /* زر مسح البحث */
    const clearBtn = document.getElementById('cert-search-clear');
    if (clearBtn) clearBtn.hidden = !query;
  }

  if (certSortSelect) {
    certSortSelect.addEventListener('change', () => {
      applySort(certSortSelect.value);
      applyCertView();
    });
    applySort(certSortSelect.value);
  }

  if (certSearch) {
    let searchTimer = null;
    certSearch.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(applyCertView, 140);
    });
    certSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { certSearch.value = ''; applyCertView(); certSearch.blur(); }
    });

    const clearBtn = document.getElementById('cert-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        certSearch.value = '';
        applyCertView();
        certSearch.focus();
      });
    }

    /* اختصار لوحة المفاتيح: "/" يقفز إلى البحث */
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      certSearch.scrollIntoView({ block: 'center', behavior: prefersReduced ? 'auto' : 'smooth' });
      certSearch.focus();
    });
  }


  /* ============================================================
     7) شريط التنقل
     ============================================================ */
  const nav = document.getElementById('site-nav');
  const burger = document.getElementById('nav-burger');
  const navLinks = document.getElementById('nav-links');
  const navAnchors = navLinks ? Array.from(navLinks.querySelectorAll('a')) : [];

  function syncBurgerLabel(open) {
    if (!burger) return;
    const lang = currentLang();
    const label = lang === 'en'
      ? (open ? 'Close menu' : 'Open menu')
      : (open ? 'إغلاق القائمة' : 'فتح القائمة');
    burger.setAttribute('aria-label', label);
    burger.dataset.enAria = open ? 'Close menu' : 'Open menu';
    burger.dataset.arAria = open ? 'إغلاق القائمة' : 'فتح القائمة';
  }

  function closeMenu(returnFocus) {
    if (!navLinks || !burger) return;
    if (!navLinks.classList.contains('is-open')) return;
    navLinks.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    syncBurgerLabel(false);
    if (returnFocus) burger.focus();
  }

  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      syncBurgerLabel(open);
      /* انقل التركيز لأول رابط حتى يستطيع مستخدم لوحة المفاتيح التنقل فوراً */
      if (open && navAnchors[0]) navAnchors[0].focus();
    });

    navAnchors.forEach((a) => a.addEventListener('click', () => closeMenu(false)));

    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !burger.contains(e.target)) closeMenu(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const dlg = document.getElementById('shortcuts-dialog');
      /* نافذة الاختصارات لها الأولوية: أغلقها أولاً ولا تلمس القائمة */
      if (dlg && dlg.open) return;
      closeMenu(true);
    });

    /* أغلق القائمة عند توسيع الشاشة حتى لا تبقى عالقة مفتوحة */
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
      if (e.matches) closeMenu(false);
    });

    syncBurgerLabel(false);
  }

  /* شريط التقدم + حالة الالتصاق + القسم النشط */
  const progressBar = document.getElementById('scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const navTargets = navAnchors
    .map((a) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      return el ? { anchor: a, el } : null;
    })
    .filter(Boolean);

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (y / max) * 100 : 0;

      if (progressBar) progressBar.style.setProperty('--progress', pct.toFixed(2) + '%');
      if (nav) nav.classList.toggle('is-stuck', y > 12);
      if (backToTop) backToTop.classList.toggle('is-visible', y > 520);

      /* القسم النشط: آخر قسم تجاوز أعلى الشاشة بمقدار 120px */
      let active = null;
      navTargets.forEach((t) => {
        if (t.el.getBoundingClientRect().top <= 120) active = t;
      });
      navTargets.forEach((t) => {
        const on = t === active;
        t.anchor.classList.toggle('is-active', on);
        if (on) t.anchor.setAttribute('aria-current', 'true');
        else t.anchor.removeAttribute('aria-current');
      });

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  /* ============================================================
     8) تبديل اللغة
     ============================================================ */
  const langBtn = document.getElementById('lang-toggle');
  const translatable = Array.from(document.querySelectorAll('[data-en]'));
  const placeholderEls = Array.from(document.querySelectorAll('[data-en-placeholder]'));
  const ariaEls = Array.from(document.querySelectorAll('[data-en-aria]'));
  const altEls = Array.from(document.querySelectorAll('[data-en-alt]'));

  translatable.forEach((el) => { el.dataset.ar = el.innerHTML; });
  placeholderEls.forEach((el) => { el.dataset.arPlaceholder = el.getAttribute('placeholder') || ''; });
  ariaEls.forEach((el) => { el.dataset.arAria = el.getAttribute('aria-label') || ''; });
  altEls.forEach((el) => { el.dataset.arAlt = el.getAttribute('alt') || ''; });

  function setLang(lang) {
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    /* مهم: قواعد CSS تستهدف html.lang-en وليس body — كان الخطأ السابق هنا */
    root.classList.toggle('lang-en', lang === 'en');
    document.body.classList.toggle('lang-en', lang === 'en');

    translatable.forEach((el) => {
      const html = lang === 'ar' ? el.dataset.ar : el.dataset.en;
      if (html !== undefined) el.innerHTML = html;
    });
    placeholderEls.forEach((el) => {
      el.setAttribute('placeholder', lang === 'ar' ? el.dataset.arPlaceholder : el.dataset.enPlaceholder);
    });
    ariaEls.forEach((el) => {
      el.setAttribute('aria-label', lang === 'ar' ? el.dataset.arAria : el.dataset.enAria);
    });
    altEls.forEach((el) => {
      el.setAttribute('alt', lang === 'ar' ? el.dataset.arAlt : el.dataset.enAlt);
    });

    if (langBtn) {
      langBtn.textContent = lang === 'ar' ? 'EN' : 'AR';
      langBtn.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل للعربية');
    }

    document.title = lang === 'ar'
      ? 'مشعل الدواس — مبرمج مبتدئ'
      : 'Meshal Aldawas — Junior Developer';

    /* ترجمة chip عبر innerHTML تمسح نقاط المستوى — نعيد بناءها */
    chips.forEach(buildLevelDots);

    syncMusicLabel();
    syncThemeLabel();
    syncChipLabels();
    updateToggleAllLabel();
    applyCertView();

    try { localStorage.setItem('site-lang', lang); } catch (e) { /* تجاهل */ }
  }

  syncChipLabels(); /* التسميات الأولية قبل أي تبديل لغة */

  if (langBtn) {
    langBtn.addEventListener('click', () => setLang(root.lang === 'en' ? 'ar' : 'en'));
    let savedLang = null;
    try { savedLang = localStorage.getItem('site-lang'); } catch (e) { savedLang = null; }
    if (savedLang === 'en') setLang('en');
  }

  /* ============================================================
     9) الوضع الفاتح / الداكن
     ============================================================ */
  const themeBtn = document.getElementById('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function syncThemeLabel() {
    if (!themeBtn) return;
    const dark = root.dataset.theme !== 'light';
    const label = currentLang() === 'en'
      ? (dark ? 'Switch to light mode' : 'Switch to dark mode')
      : (dark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن');
    themeBtn.setAttribute('aria-label', label);
    themeBtn.dataset.enAria = dark ? 'Switch to light mode' : 'Switch to dark mode';
    themeBtn.dataset.arAria = dark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن';
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#f4f7fb' : '#101c2c');
    try { localStorage.setItem('site-theme', theme); } catch (e) { /* تجاهل */ }
    syncThemeLabel();
  }

  if (themeBtn) {
    syncThemeLabel();
    themeBtn.addEventListener('click', () => {
      setTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
    });
  }

  /* ============================================================
     10) الموسيقى الخلفية
     ============================================================ */
  const musicBtn = document.getElementById('music-toggle');
  const musicAudio = document.getElementById('bg-music');
  const musicVolume = document.getElementById('music-volume');

  function syncMusicLabel() {
    if (!musicBtn || !musicAudio) return;
    const playing = !musicAudio.paused;
    const label = currentLang() === 'en'
      ? (playing ? 'Pause background music' : 'Play background music')
      : (playing ? 'إيقاف الموسيقى الخلفية' : 'تشغيل الموسيقى الخلفية');
    musicBtn.setAttribute('aria-label', label);
  }

  if (musicBtn && musicAudio) {
    /* استرجاع مستوى الصوت المحفوظ */
    let savedVol = null;
    try { savedVol = localStorage.getItem('site-volume'); } catch (e) { savedVol = null; }
    if (musicVolume) {
      if (savedVol !== null) musicVolume.value = savedVol;
      const applyVolume = () => {
        musicAudio.volume = Number(musicVolume.value) / 100;
        musicVolume.style.setProperty('--vol', musicVolume.value + '%');
      };
      applyVolume();
      musicVolume.addEventListener('input', () => {
        applyVolume();
        try { localStorage.setItem('site-volume', musicVolume.value); } catch (e) { /* تجاهل */ }
      });
    }

    musicBtn.addEventListener('click', () => {
      if (musicAudio.paused) {
        const p = musicAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => showToast(currentLang() === 'en'
            ? 'Could not play audio in this browser.'
            : 'تعذّر تشغيل الصوت في هذا المتصفح.'));
        }
      } else {
        musicAudio.pause();
      }
    });

    musicAudio.addEventListener('play', () => {
      musicBtn.classList.add('playing');
      musicBtn.setAttribute('aria-pressed', 'true');
      syncMusicLabel();
    });

    musicAudio.addEventListener('pause', () => {
      musicBtn.classList.remove('playing');
      musicBtn.setAttribute('aria-pressed', 'false');
      syncMusicLabel();
    });

    /* لا تشغيل تلقائي: المتصفحات تحظره، وهو مزعج للزائر وقارئ الشاشة. */
  }

  /* ============================================================
     11) نسخ البريد/الجوال + سنة التذييل + نموذج التواصل
     ============================================================ */
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy || '';
      const lang = currentLang();
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else {
          const tmp = document.createElement('textarea');
          tmp.value = value;
          tmp.setAttribute('readonly', '');
          tmp.style.position = 'fixed';
          tmp.style.opacity = '0';
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          tmp.remove();
        }
        const doneText = btn.dataset[lang + 'Done'] || 'تم النسخ';
        const copyText = btn.dataset[lang + 'Copy'] || 'نسخ';
        btn.textContent = doneText;
        btn.classList.add('done');
        showToast(lang === 'en' ? 'Copied: ' + value : 'تم النسخ: ' + value);
        window.setTimeout(() => {
          btn.textContent = copyText;
          btn.classList.remove('done');
        }, 1800);
      } catch (err) {
        showToast(lang === 'en' ? 'Copy failed — please copy manually.' : 'تعذّر النسخ — انسخه يدوياً.');
      }
    });
  });

  const footYear = document.getElementById('foot-year');
  if (footYear) footYear.textContent = String(Math.max(2026, new Date().getFullYear()));

  /* ---- أزرار المشاركة والطباعة ---- */
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const lang = currentLang();
      const shareData = {
        title: document.title,
        text: lang === 'en'
          ? 'Meshal Aldawas — Junior Developer portfolio'
          : 'مشعل الدواس — ملف مبرمج مبتدئ',
        url: window.location.href,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(window.location.href);
          showToast(lang === 'en' ? 'Link copied to clipboard.' : 'تم نسخ رابط الصفحة.');
        } else {
          showToast(lang === 'en' ? 'Copy the address from your browser bar.' : 'انسخ الرابط من شريط المتصفح.');
        }
      } catch (err) {
        /* المستخدم ألغى المشاركة — لا نعرض خطأ */
      }
    });
  }

  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      /* افتح كل مجموعات الشهادات قبل الطباعة حتى تظهر في الـ PDF */
      certGroups.forEach((g) => { if (!g.hidden) g.open = true; });
      window.setTimeout(() => window.print(), 120);
    });
  }

  /* ---- نافذة اختصارات لوحة المفاتيح ---- */
  const shortcutsDialog = document.getElementById('shortcuts-dialog');
  const shortcutsBtn = document.getElementById('shortcuts-btn');
  const shortcutsClose = document.getElementById('shortcuts-close');

  function openShortcuts() {
    if (!shortcutsDialog) return;
    if (typeof shortcutsDialog.showModal === 'function') shortcutsDialog.showModal();
    else shortcutsDialog.setAttribute('open', '');
  }
  function closeShortcuts() {
    if (!shortcutsDialog) return;
    if (typeof shortcutsDialog.close === 'function') shortcutsDialog.close();
    else shortcutsDialog.removeAttribute('open');
  }

  if (shortcutsBtn) shortcutsBtn.addEventListener('click', openShortcuts);
  if (shortcutsClose) shortcutsClose.addEventListener('click', closeShortcuts);
  if (shortcutsDialog) {
    /* الضغط خارج المحتوى يغلق النافذة */
    shortcutsDialog.addEventListener('click', (e) => {
      if (e.target === shortcutsDialog) closeShortcuts();
    });
    /* Esc: المتصفح يتكفّل بها عادةً، لكننا نضمنها صراحةً */
    shortcutsDialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeShortcuts(); }
    });
  }

  /* ---- اختصارات لوحة المفاتيح العامة ---- */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    /* Esc يغلق نافذة الاختصارات — نتعامل معها هنا قبل فحص عنصر التركيز،
       لأن التركيز داخل <dialog> قد يقع على زر الإغلاق */
    if (e.key === 'Escape' && shortcutsDialog && shortcutsDialog.open) {
      e.preventDefault();
      closeShortcuts();
      return;
    }

    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const key = e.key.toLowerCase();

    if (key === '?' || (e.shiftKey && key === '/')) {
      e.preventDefault();
      if (shortcutsDialog && shortcutsDialog.open) closeShortcuts();
      else openShortcuts();
      return;
    }

    if (key === 't' && themeBtn) { e.preventDefault(); themeBtn.click(); return; }
    if (key === 'l' && langBtn) { e.preventDefault(); langBtn.click(); return; }
    if (key === 'm' && musicBtn) { e.preventDefault(); musicBtn.click(); }
  });

  /* ---- نموذج التواصل: تحقق فوري + حماية من السبام + إرسال ---- */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const statusEl = contactForm.querySelector('.form-status');
    const submitBtn = contactForm.querySelector('.form-submit');
    const nameInput = document.getElementById('cf-name');
    const emailInput = document.getElementById('cf-email');
    const messageInput = document.getElementById('cf-message');
    const countEl = document.getElementById('cf-count');
    const honeypot = document.getElementById('cf-website');

    /* وقت فتح الصفحة: إرسال أسرع من 3 ثوانٍ يكاد يكون آلياً */
    const formOpenedAt = Date.now();

    const statusText = {
      sending: { ar: 'جاري الإرسال...', en: 'Sending...' },
      success: { ar: 'تم إرسال رسالتك بنجاح، بردّ عليك قريباً!', en: 'Message sent successfully — I will reply soon!' },
      error: { ar: 'صار خطأ، حاول مرة ثانية أو راسلني على الإيميل مباشرة.', en: 'Something went wrong — please try again or email me directly.' },
      invalid: { ar: 'راجع الحقول المعلّمة بالأحمر قبل الإرسال.', en: 'Please fix the highlighted fields before sending.' },
      tooFast: { ar: 'خذ وقتك في كتابة الرسالة ثم أعد الإرسال.', en: 'Please take a moment to write your message, then resend.' },
    };

    const errorText = {
      nameShort: { ar: 'اكتب اسمك (حرفان على الأقل).', en: 'Enter your name (at least 2 characters).' },
      emailBad: { ar: 'صيغة البريد الإلكتروني غير صحيحة.', en: 'That email address looks invalid.' },
      messageShort: { ar: 'الرسالة قصيرة جداً (10 أحرف على الأقل).', en: 'Message is too short (10 characters minimum).' },
      required: { ar: 'هذا الحقل مطلوب.', en: 'This field is required.' },
    };

    const emailRe = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

    function fieldError(input) {
      const v = input.value.trim();
      if (!v) return 'required';
      if (input === nameInput && v.length < 2) return 'nameShort';
      if (input === emailInput && !emailRe.test(v)) return 'emailBad';
      if (input === messageInput && v.length < 10) return 'messageShort';
      return null;
    }

    function paintField(input, { silent = false } = {}) {
      const errEl = document.getElementById(input.id + '-err');
      const key = fieldError(input);
      const lang = currentLang();

      if (key) {
        input.classList.remove('valid');
        input.classList.toggle('invalid', !silent);
        input.setAttribute('aria-invalid', 'true');
        if (errEl) errEl.textContent = silent ? '' : errorText[key][lang];
      } else {
        input.classList.remove('invalid');
        input.classList.add('valid');
        input.removeAttribute('aria-invalid');
        if (errEl) errEl.textContent = '';
      }
      return !key;
    }

    [nameInput, emailInput, messageInput].forEach((input) => {
      if (!input) return;
      /* أثناء الكتابة: لا نصرخ بالخطأ، فقط نزيله عند التصحيح */
      input.addEventListener('input', () => {
        if (input.classList.contains('invalid')) paintField(input);
      });
      /* عند مغادرة الحقل: نعرض الخطأ إن وُجد */
      input.addEventListener('blur', () => {
        if (input.value.trim()) paintField(input);
      });
    });

    if (messageInput && countEl) {
      const max = Number(messageInput.getAttribute('maxlength')) || 1200;
      const updateCount = () => {
        const n = messageInput.value.length;
        countEl.textContent = n + ' / ' + max;
        countEl.classList.toggle('near-limit', n > max * 0.9);
      };
      messageInput.addEventListener('input', updateCount);
      updateCount();
    }

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const lang = currentLang();

      /* 1) مصيدة الروبوتات: إذا امتلأت، نتظاهر بالنجاح ولا نرسل شيئاً */
      if (honeypot && honeypot.value.trim()) {
        statusEl.textContent = statusText.success[lang];
        statusEl.className = 'form-status success';
        contactForm.reset();
        return;
      }

      /* 2) إرسال سريع جداً = على الأغلب سكربت آلي */
      if (Date.now() - formOpenedAt < 3000) {
        statusEl.textContent = statusText.tooFast[lang];
        statusEl.className = 'form-status error';
        return;
      }

      /* 3) تحقق من كل الحقول */
      const results = [nameInput, emailInput, messageInput].map((i) => (i ? paintField(i) : true));
      if (results.indexOf(false) !== -1) {
        statusEl.textContent = statusText.invalid[lang];
        statusEl.className = 'form-status error';
        const firstBad = contactForm.querySelector('.invalid');
        if (firstBad) firstBad.focus();
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = statusText.sending[lang];
      statusEl.className = 'form-status';

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) throw new Error('Form submission failed');

        statusEl.textContent = statusText.success[lang];
        statusEl.className = 'form-status success';
        contactForm.reset();
        [nameInput, emailInput, messageInput].forEach((i) => {
          if (i) i.classList.remove('valid', 'invalid');
        });
        if (countEl) countEl.textContent = '0 / 1200';
        showToast(statusText.success[lang]);
      } catch (err) {
        statusEl.textContent = statusText.error[lang];
        statusEl.className = 'form-status error';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
});
