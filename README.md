# مشعل الدواس — صفحة شخصية (Portfolio)

🔗 **الموقع مباشرة:** [c9mx1188.github.io/Meshalaldawas](https://c9mx1188.github.io/Meshalaldawas/)

صفحة شخصية لمبرمج مبتدئ من الرياض، توثّق المسار التعليمي والمهارات والمشاريع وأكثر من 50 شهادة تدريبية. بتصميم "مخطط هندسي" (Blueprint) مستوحى من خلفية صاحبها في الرسوم التقنية.

## المميزات

- **ثنائية اللغة**: تبديل فوري بين العربية (RTL) والإنجليزية (LTR) مع حفظ اختيار الزائر.
- **شهادات قابلة للتصفح**: 53 شهادة في 8 مجموعات قابلة للطي، مع بحث وترتيب.
- **وضع فاتح/داكن** واختصارات لوحة مفاتيح (`?` لعرضها).
- **مشاريع** تربط مباشرة بمستودعات GitHub.
- **نموذج تواصل** عبر [Formspree](https://formspree.io) بدون سيرفر، مع حقل مصيدة روبوتات.
- **PWA**: تعمل بلا إنترنت (Service Worker) وقابلة للتثبيت.
- **موسيقى خلفية اختيارية** مع متحكم صوت.
- **إمكانية وصول**: رابط تخطي المحتوى، وسوم ARIA، واحترام `prefers-reduced-motion`.
- **SEO ومشاركة**: OpenGraph وTwitter Card وJSON-LD وsitemap.

## التقنيات

HTML5 · CSS3 (Grid/Flexbox) · JavaScript (Vanilla) · Service Worker · Formspree · GitHub Pages

## هيكل الملفات

```
├── index.html               # الصفحة الرئيسية
├── style.css                # التنسيقات
├── interactions.js          # التفاعلات (لغة، ثيم، شهادات، نموذج، موسيقى)
├── sw.js / register-sw.js   # Service Worker وتسجيله
├── manifest.webmanifest     # إعدادات PWA
├── offline.html / 404.html  # صفحتا عدم الاتصال والخطأ
├── sitemap.xml / robots.txt # SEO
├── logo*.png                # الشعار بأحجام مختلفة (+ نسخة maskable)
├── og-image.png             # صورة معاينة المشاركة
├── background-music.mp3     # الموسيقى الخلفية
└── meshal-aldawas-cv.pdf    # السيرة الذاتية
```

## التشغيل محلياً

بدون أي عملية بناء:

```bash
git clone https://github.com/C9MX1188/Meshalaldawas.git
cd Meshalaldawas
python3 -m http.server 8000   # ثم افتح http://localhost:8000
```

> ملاحظة: عند تعديل أي ملف مخزّن في `sw.js` ارفع رقم `CACHE_VERSION` حتى يصل التحديث للزوار.

## التواصل

[LinkedIn](https://www.linkedin.com/in/%D9%85%D8%B4%D8%B9%D9%84-%D8%A7%D9%84%D8%AF%D9%88%D8%A7%D8%B3-6102771b5/) · [GitHub](https://github.com/C9MX1188)
