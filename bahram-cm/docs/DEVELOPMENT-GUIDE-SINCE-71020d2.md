# راهنمای توسعه — از کامیت `71020d2` به بعد

> **نقطهٔ مرجع:** `71020d24d31bead28a00ef4fe74ecc9e55875ba3`  
> *Add MySQL character set configuration to database connection options for UTF-8 support*

این سند خلاصهٔ تغییرات معماری، مسیرهای مهم، تنظیمات محیط، و نکات عیب‌یابی است — برای ادامهٔ کار روی پروژه **bahram-cm** (آکادمی بهرام رستمی).

---

## فهرست

1. [خلاصهٔ تغییرات](#خلاصهٔ-تغییرات)
2. [معماری کلی](#معماری-کلی)
3. [مسیرها و بلاگ](#مسیرها-و-بلاگ)
4. [لایهٔ API](#لایهٔ-api)
5. [کش و ISR](#کش-و-isr)
6. [رسانه و تصاویر](#رسانه-و-تصاویر)
7. [پنل ادمین Next.js](#پنل-ادمین-nextjs)
8. [چت‌بات](#چت‌بات)
9. [متغیرهای محیطی](#متغیرهای-محیطی)
10. [اجرای محلی](#اجرای-محلی)
11. [عیب‌یابی رایج](#عیب‌یابی-رایج)
12. [چیزهایی که نباید برگردانده شوند](#چیزهایی-که-نباید-برگردانده-شوند)
13. [کامیت‌های بعد از 71020d2](#کامیت‌های-بعد-از-71020d2)

---

## خلاصهٔ تغییرات

از کامیت پایه تا HEAD، حدود **۵۰۰ فایل** تغییر کرده‌اند. محورهای اصلی:

| حوزه | وضعیت |
|------|--------|
| پنل ادمین یکپارچه `/admin` | Next.js — مقالات، رسانه، کش، چت‌بات، فروش، سئو |
| API عمومی Laravel (`routes/api.php`) | مقالات، FAQ، نظرات دانشجویان، لیدها |
| API ادمین v1 (`routes/api_v1.php`) | CRUD کامل + کش + چت‌بات + رسانه |
| ISR + کش چندلایه | Next fetch cache، Laravel `RuntimeCache`، هدر مرورگر، Cloudflare |
| رسانه | CDN، legacy map، alt resolver، بهینه‌ساز تصویر |
| بلاگ عمومی | **`/insights`** (نه `/blog`) |
| چت‌بات | ویجت سایت، کپچا، صدای Web Audio داخلی |
| SWR در ادمین | داشبورد و پنل کش (scoped — فرم‌ها/خرید/چت runtime جدا) |

---

## معماری کلی

```mermaid
flowchart TB
  subgraph browser [مرورگر]
    Site[سایت عمومی localhost:3000]
    Admin[پنل /admin]
    Chat[چت‌بات]
  end

  subgraph next [Next.js 16]
    MW[middleware.ts]
    ISR[getStaticJson + revalidate]
    Rev[/api/revalidate]
    Proxy[/api/* proxy]
  end

  subgraph laravel [Laravel backend :8010]
    PubAPI[routes/api.php — عمومی]
    V1API[routes/api_v1.php — ادمین]
    Cache[CacheService + RuntimeCache]
    Media[MediaService + CDN]
  end

  Site --> MW
  Admin --> MW
  Chat --> Proxy
  MW -->|BACKEND_PROXY_URL| laravel
  ISR -->|مستقیم /api/articles| PubAPI
  Proxy --> V1API
  Cache -->|webhook| Rev
  Rev --> ISR
```

**قانون طلایی:**  
- **خواندن محتوای عمومی (ISR):** `getStaticJson` → `BACKEND_PROXY_URL/api/...`  
- **فرم، خرید، چت، ادمین:** `getJson` / `postJson` → همان origin (`localhost:3000/api/...`) با `cache: no-store`  
- **ادمین احراز هویت‌شده:** `adminFetch` → `/api/v1/...` (از `API_INTERNAL_URL` یا proxy)

---

## مسیرها و بلاگ

### مسیرهای عمومی (canonical)

| نوع | مسیر | فایل |
|-----|------|------|
| فهرست بلاگ | `/insights` | `app/insights/page.tsx` |
| مقاله | `/insights/[slug]` | `app/insights/[slug]/page.tsx` |
| مسیر legacy | `/articles/*` | هنوز وجود دارد؛ canonical = `/insights` |
| ریدایرکت | `/blog` → `/insights` | `next.config.ts` |

### helper مسیر

```ts
// lib/blog/paths.ts
import { articlePublicPath, BLOG_INDEX_PATH } from '@/lib/blog/paths';
articlePublicPath('kasht-moz'); // → /insights/kasht-moz
```

### ادمین مقالات

| مسیر | کاربرد |
|------|--------|
| `/admin/blog` | لیست |
| `/admin/blog/new` | ایجاد |
| `/admin/blog/[id]` | ویرایش |

**توجه:** `/admin/blog` مسیر پنل است؛ با `/blog` عمومی اشتباه گرفته نشود.

### AI و لینک‌های داخلی

در پرامپت‌های AI و سئو همیشه `/insights/{slug}` — هرگز `/blog/`.  
مراجعه: `lib/ai/seoFix.ts`, `lib/ai/articlePrompt.ts`.

---

## لایهٔ API

### عمومی — `backend/routes/api.php`

```
GET  /api/articles
GET  /api/articles/{slug}
GET  /api/faqs
GET  /api/student-testimonials
...
```

کنترلرها از `RuntimeCache::remember` و `MediaAltResolver::warmReferences` برای کاهش N+1 استفاده می‌کنند.

### ادمین — `backend/routes/api_v1.php` (پیشوند `/api/v1`)

```
GET/PATCH  /api/v1/panel/cache/*
POST       /api/v1/articles
GET        /api/v1/panel/articles
GET        /api/v1/panel/leads/export
GET        /api/v1/panel/orders/export
...
```

**احراز هویت ادمین (headless):** پنل Next فقط با توکن Sanctum (`adminFetch` + کوکی `bahram_admin_token`) کار می‌کند.  
پل web-session قدیمی (`auth/web-session` و `/api/admin/filament-session`) همراه با Filament حذف شده است — commerce، محصولات، سفارش‌ها و FAQ همگی از همان API v1 با Bearer token استفاده می‌کنند.

### فرانت‌اند — انتخاب fetch

| تابع | کاربرد | کش |
|------|--------|-----|
| `getStaticJson` | مقالات، transformations، تنظیمات عمومی ISR | `next.revalidate` + tags |
| `getJson` / `postJson` | فرم، چت، کلاینت | `no-store` |
| `adminFetch` | پنل ادمین | `no-store` + session |

### ⚠️ اشتباه رایج: `API_INTERNAL_URL`

```
API_INTERNAL_URL=http://127.0.0.1:8010/api/v1   ← فقط ادمین v1
```

`getStaticJson` **نباید** از `API_INTERNAL_URL` استفاده کند.  
مسیر عمومی: `BACKEND_PROXY_URL + /api` (مثلاً `http://127.0.0.1:8010/api/articles/...`).

اگر `/insights/[slug]` همیشه 404 می‌دهد ولی `/api/articles/{slug}` در مرورگر 200 است → احتمالاً URL اشتباه در SSR است.

---

## کش و ISR

### لایه‌ها

1. **Next.js ISR** — `revalidate` + `revalidateTag` در `lib/cache/contentRevalidation.ts`
2. **Laravel object cache** — `App\Support\RuntimeCache` (TTL از تنظیمات ادمین)
3. **مرورگر** — `Cache-Control` از `middleware.ts` + `lib/cache/headers.ts`
4. **Cloudflare** — purge خودکار/دستی از `CacheService`

### Webhook ISR

| محل | متغیر |
|-----|--------|
| Laravel | `REVALIDATE_SECRET`, `REVALIDATE_WEBHOOK_URL` در `config/bahram.php` |
| Next.js | `REVALIDATE_SECRET` در `.env.local` |
| endpoint | `POST /api/revalidate` |

پیش‌فرض dev در `config/bahram.php`:
- secret: `bahram-dev-revalidate-secret`
- webhook: `http://localhost:3000/api/revalidate`

Seeder: `php artisan db:seed --class=CacheIntegrationsSeeder`

### پنل کش — `/admin/cache`

| تب | محتوا |
|----|--------|
| dashboard | StatusCard با badge **OK** / **OFF** |
| profiles | پریست‌های عملکرد |
| modules | فعال/غیرفعال ماژول‌ها |
| ttl | TTL هر نوع محتوا |
| purge | پاک‌سازی دستی ISR / Cloudflare |
| advanced | InfoCard (Webhook، درایور Laravel، API) |

**منطق badge OK:**
- ISR: `page_cache` + webhook + نه `developer_mode`
- Laravel: `object_cache` فعال
- مرورگر: `browser_cache` فعال
- Cloudflare: `cloudflare_configured`
- درایور Laravel OK: هر چیزی جز `array`

**SWR:** `hooks/useCachePanel.ts` — کلید `admin-cache-panel`، refresh روی focus.

**پاک‌سازی خودکار پس از save:** `ContentPublishService` → `revalidatePublicContent` وقتی `auto_purge_on_save` روشن است.

### مسیرهایی که ISR **نیستند**

```
/admin, /purchase, /apply, /api/chatbot, /api/captcha, ...
```

لیست: `lib/cache/staticScope.ts` → `DYNAMIC_ROUTE_PREFIXES`

---

## رسانه و تصاویر

### جریان URL

```
/media/site-photos/*  → /storage/media/site/*  (redirect + legacyMap)
/storage/media/*      → Laravel MediaDeliveryController (gallery)
/cdn/media/*          → نسخهٔ resize شده
```

فرانت: `lib/mediaUrl.ts`, `lib/imageLoader.ts`, `components/ui/AppImage.tsx`

### نکات مهم

- `AppImage` با `fill` باید wrapper با ارتفاع مشخص داشته باشد (`aspect-*` یا `min-h`).
- `next.config.ts` → `remotePatterns` برای CDN origin.
- آپلود: `MediaService` + prewarm variants.
- Alt: `MediaAltResolver` — در API مقالات warm می‌شود.

### دستورات Artisan مفید

```bash
php artisan media:import-site
php artisan media:prewarm-variants
php artisan articles:normalize-slugs
php artisan insights:import
```

---

## پنل ادمین Next.js

### ساختار

```
app/admin/(panel)/
  blog/          مقالات + ویرایشگر TipTap + AI + SEO score
  cache/         کش و ISR
  chatbot/       تنظیمات و صف اپراتور
  commerce/      محصولات، سفارش‌ها، نظرات دانشجویان
  gallery/       کتابخانه رسانه
  seo/           متا و تحلیل
  settings/      تنظیمات سایت + یکپارچه‌سازی کش
  ai/settings/   Gemini، تصویر، چت‌بات
```

ناوبری: `app/admin/(panel)/admin-nav.ts`

### داشبورد SWR

`hooks/useDashboardSummary.ts` — فقط `/admin`، کلید جدا، ۳۰ثانیه refresh.  
**به فرم مقاله / SEO / خرید / runtime چت وصل نیست.**

### layout.tsx — اسکریپت تم

اسکریپت boot تم در `<head>` با `dangerouslySetInnerHTML` است — **نه** `next/script` با children (React 19 خطا می‌دهد).

---

## چت‌بات

### فایل‌های کلیدی

| فایل | نقش |
|------|-----|
| `components/chatbot/FloatingChatbot.tsx` | ویجت اصلی |
| `components/chatbot/SiteChatbotEntry.tsx` | lazy load از layout |
| `lib/chatbot/actions.ts` | server actions |
| `lib/chatbot/notificationSound.ts` | صدای نوتیف — **Web Audio داخلی، بدون URL خارجی** |
| `components/captcha/CaptchaField.tsx` | کپچا ریاضی inline در footer |

### رفتار

- بارگذاری پس از `window.load` (نه کلیک) — عمداً حفظ شود.
- کپچا چت‌بات: یک خط — سؤال + refresh + فیلد `flex-1` با placeholder «جواب را بنویسید».
- صدا: `playChatbotNotificationTone` / `playChatbotReplyTone` — oscillator در مرورگر.

### backend

`ChatbotService`, `ChatbotController` (v1), جداول `chatbot_sessions`, `chatbot_logs`.

---

## متغیرهای محیطی

### Frontend `.env.local` (حداقل dev)

```env
BACKEND_PROXY_URL=http://127.0.0.1:8010
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_CDN_ORIGIN=http://127.0.0.1:8010
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REVALIDATE_SECRET=bahram-dev-revalidate-secret

# اختیاری — فقط برای adminFetch مستقیم به v1 (نه برای getStaticJson)
API_INTERNAL_URL=http://127.0.0.1:8010/api/v1
```

### Backend `.env` (نکات)

```env
FRONTEND_URL=http://localhost:3000
REVALIDATE_SECRET=bahram-dev-revalidate-secret
REVALIDATE_WEBHOOK_URL=http://localhost:3000/api/revalidate
CACHE_DRIVER=redis          # production — array در dev = badge OFF در پنل
```

---

## اجرای محلی

```bash
# ترمینال ۱ — Laravel
cd bahram-cm/backend
php artisan serve --port=8010

# ترمینال ۲ — Next.js
cd bahram-cm/frontend
npm run dev
```

بررسی سریع:

```bash
curl http://127.0.0.1:8010/api/articles/kasht-moz     # باید 200
curl -I http://localhost:3000/insights/kasht-moz    # باید 200
curl -I http://localhost:3000/blog                  # باید 308 → /insights
curl http://localhost:3000/api/admin/cache/panel    # با session ادمین
```

---

## عیب‌یابی رایج

### مقاله در API هست ولی `/insights/slug` → 404

1. `getStaticJson` را چک کن — باید به `8010/api/articles/...` برود نه `8010/api/v1/api/...`
2. کش fetch Next: dev را restart کن یا `revalidateTag('articles')`
3. مقاله `status=published` و `published_at <= now` باشد

### تصاویر دیده نمی‌شوند

1. `AppImage` + `fill` → wrapper با ارتفاع
2. `NEXT_PUBLIC_CDN_ORIGIN` و `remotePatterns`
3. مسیر legacy: `lib/media/legacyMap.generated.ts`

### ISR بعد از save به‌روز نمی‌شود

1. `REVALIDATE_SECRET` یکسان در Laravel و Next
2. `auto_purge_on_save` در `/admin/cache`
3. `developer_mode` خاموش باشد

### چت‌بات کپچا خیلی باریک

`CaptchaField` با `variant="site" compact inline` — input باید `flex-1` داشته باشد.

### خطای React 19 در layout

```
Encountered a script tag while rendering React component
```

→ اسکریپت inline در `<head>` با `dangerouslySetInnerHTML`، نه `<Script>{children}</Script>`.

### خطاهای TypeScript شناخته‌شده (pre-existing)

`ArticleBodyEditor.tsx`, `ImageGalleryModal.tsx`, `lib/ai/seoFix.ts`, `ChatbotWidgetClient.tsx` — ممکن است قبل از این دور تغییرات هم بوده باشند.

---

## چیزهایی که نباید برگردانده شوند

| موضوع | دلیل |
|-------|------|
| بلاگ عمومی روی `/blog` | canonical = `/insights` + ریدایرکت |
| `getStaticJson` از `API_INTERNAL_URL` | URL اشتباه → 404 همهٔ مقالات |
| چت‌بات فقط با کلیک load | UX فعلی عمدی است |
| SWR داشبورد روی کل ادمین | scoped به dashboard/cache panel |
| `next/script` inline در root layout | React 19 |
| کش 404 در `ArticleController::show` داخل `RuntimeCache` | فقط مدل Article cache شود، نه JsonResponse خطا |

---

## کامیت‌های بعد از 71020d2

| SHA | خلاصه |
|-----|--------|
| `9bade7d` | پایهٔ گسترده: ادمین، چت‌بات، commerce، media |
| `5b1c0f2` | testimonials API، media import، admin theme |
| `41351e6` | کش چندلایه، CacheService، middleware headers |
| `6e9b51a` | RuntimeCache 3600s، ISR defaults، blog→insights، MediaAltResolver |
| `05c5acc` | badge OK/OFF در پنل کش، InfoCard، danger tone |

---

## فایل‌های مرجع سریع

```
bahram-cm/
├── docs/
│   ├── DEPLOYMENT.md
│   ├── CDN-DEPLOYMENT.md              ← راهنمای CDN + Cloudflare
│   ├── cloudflare-cache-rules.example.json
│   └── DEVELOPMENT-GUIDE-SINCE-71020d2.md
├── frontend/
│   ├── lib/services/staticFetch.ts          ISR fetch
│   ├── lib/cache/                           کش فرانت
│   ├── lib/blog/paths.ts                    مسیر بلاگ
│   ├── app/insights/                          صفحات بلاگ
│   ├── app/admin/(panel)/cache/page.tsx     پنل کش
│   └── middleware.ts
└── backend/
    ├── routes/api.php                       API عمومی
    ├── routes/api_v1.php                    API ادمین
    ├── app/Services/CacheService.php
    ├── app/Services/ContentPublishService.php
    ├── app/Support/RuntimeCache.php
    └── config/bahram.php                    ISR webhook defaults
```

---

## به‌روزرسانی این سند

هر بار تغییر معماری مهم (مسیر جدید، لایهٔ کش، env جدید):

1. بخش مربوطه را در همین فایل به‌روز کنید.
2. در commit message به `docs/DEVELOPMENT-GUIDE-SINCE-71020d2.md` اشاره کنید.
3. عیب‌یابی جدید را به بخش [عیب‌یابی رایج](#عیب‌یابی-رایج) اضافه کنید.

---

*آخرین به‌روزرسانی: ۱۴۰۵/۰۴/۱۷ — نسبت به کامیت پایه `71020d24d31bead28a00ef4fe74ecc9e55875ba3`*
