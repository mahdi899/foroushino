# راهنمای CDN — آکادمی بهرام (bahram-cm)

این سند معماری CDN، تنظیمات محیط، پنل ادمین، و مراحل deploy production با **Cloudflare** را شرح می‌دهد.

---

## فهرست

1. [معماری چندلایه](#معماری-چندلایه)
2. [چه چیزی کجا کش می‌شود؟](#چه-چیزی-کجا-کش-می‌شود)
3. [تنظیمات محیط (env)](#تنظیمات-محیط-env)
4. [پنل ادمین](#پنل-ادمین)
5. [Cloudflare — DNS و Cache Rules](#cloudflare--dns-و-cache-rules)
6. [Purge خودکار](#purge-خودکار)
7. [توسعه محلی (localhost)](#توسعه-محلی-localhost)
8. [چک‌لیست production](#چک‌لیست-production)
9. [عیب‌یابی](#عیب‌یابی)

---

## معماری چندلایه

```mermaid
flowchart TB
  User[کاربر] --> CF[Cloudflare Edge]
  CF --> Next[Next.js — سایت + /admin]
  CF -->|اختیاری subdomain| Laravel[Laravel — /cdn /storage /api]

  Next -->|ISR fetch| Laravel
  Laravel -->|webhook| Rev[/api/revalidate]
  Rev --> Next
  Laravel -->|purge API| CF

  Next --> Redis[(Redis)]
  Laravel --> Redis
  Laravel --> Disk[/storage/media]
```

| لایه | فناوری | نقش |
|------|--------|-----|
| **Edge CDN** | Cloudflare | کش HTML، `_next/static`، `/cdn/media` |
| **ISR** | Next.js `revalidate` + tags | HTML مقالات و صفحات عمومی |
| **Object cache** | Laravel `RuntimeCache` | پاسخ API عمومی |
| **Media CDN** | Laravel `/cdn/media?w=&q=` | resize + WebP + cache 1 سال |
| **Browser** | `Cache-Control` | کش مرورگر کاربر |

---

## چه چیزی کجا کش می‌شود؟

| مسیر | هدر edge | TTL | Purge |
|------|----------|-----|-------|
| `/_next/static/*` | `CDN-Cache-Control: immutable` | 1 سال | deploy جدید |
| `/fonts/*`, `/icons/*`, `/media/*` (public) | immutable | 1 سال | deploy |
| `/cdn/media/*` | `CDN-Cache-Control: immutable` | 1 سال | purge media prefix |
| `/storage/media/*` | همان (middleware) | 1 سال | purge media prefix |
| HTML عمومی (`/`, `/insights/*`, …) | `CDN-Cache-Control` | از پنل (TTL مرورگر) | ISR + CF URL purge |
| `/admin/*`, `/api/chatbot/*`, فرم‌ها | bypass | — | — |

### فایل‌های کلیدی

| فایل | کار |
|------|-----|
| `frontend/middleware.ts` | HTML + media proxy headers |
| `frontend/next.config.ts` | headers برای static |
| `frontend/lib/cache/headers.ts` | ساخت `Cache-Control` / `CDN-Cache-Control` |
| `backend/app/Services/MediaDeliveryService.php` | resize + headers رسانه |
| `backend/app/Services/CacheService.php` | purge ISR + Cloudflare |
| `backend/app/Services/ContentPublishService.php` | purge خودکار پس از save |
| `backend/app/Support/CdnUrls.php` | URLهای purge |

---

## تنظیمات محیط (env)

### Frontend (`.env.local` / production)

```env
NEXT_PUBLIC_SITE_URL=https://bahramrostami.com
NEXT_PUBLIC_API_BASE_URL=https://bahramrostami.com
BACKEND_PROXY_URL=https://api.bahramrostami.com

# Origin مستقیم برای تصاویر resize — توصیه: subdomain CDN
NEXT_PUBLIC_CDN_ORIGIN=https://cdn.bahramrostami.com
NEXT_PUBLIC_MEDIA_URL=https://cdn.bahramrostami.com

REVALIDATE_SECRET=<secret-مشترک-با-laravel>
```

### Backend (`.env`)

```env
APP_URL=https://api.bahramrostami.com
FRONTEND_URL=https://bahramrostami.com

# URL عمومی رسانه در پاسخ API
MEDIA_URL=https://cdn.bahramrostami.com
MEDIA_CACHE_MAX_AGE=31536000

REVALIDATE_SECRET=<همان-secret>
REVALIDATE_WEBHOOK_URL=https://bahramrostami.com/api/revalidate

CLOUDFLARE_ZONE_ID=<zone-id>
CLOUDFLARE_API_TOKEN=<token با Cache Purge + Zone Read>

CACHE_STORE=redis
```

### Seeder یکپارچه‌سازی

```bash
cd backend
php artisan db:seed --class=CacheIntegrationsSeeder
```

Webhook و Cloudflare credentials از `.env` به DB کپی می‌شوند.

---

## پنل ادمین

### `/admin/settings#cache-integrations`

- **Webhook ISR** — URL + secret
- **Cloudflare** — Zone ID + API Token
- دکمه **تست** برای هر کدام

### `/admin/cache`

| ماژول | توصیه production |
|--------|-------------------|
| کش صفحه ISR | ✅ روشن |
| کش Laravel | ✅ روشن |
| کش مرورگر | ✅ روشن |
| **کش CDN (HTML)** | ✅ روشن |
| **Purge خودکار Cloudflare** | ✅ روشن |
| developer_mode | ❌ خاموش |

**پریست «متعادل»** و **«حداکثر سرعت»** اکنون `cdn_html_cache` و `cloudflare_auto_purge` را فعال می‌کنند.

Badge **Cloudflare → OK** فقط وقتی Zone ID + Token تنظیم شده باشد (در localhost معمولاً OFF است).

---

## Cloudflare — DNS و Cache Rules

### گزینه A — یک دامنه (ساده‌تر)

```
bahramrostami.com  →  Next.js (proxy نارنجی ☁️)
api.bahramrostami.com  →  Laravel (proxy ☁️)
```

Next middleware مسیرهای `/cdn` و `/storage` را به Laravel proxy می‌کند.

### گزینه B — subdomain CDN (توصیه production)

```
bahramrostami.com       → Next.js
cdn.bahramrostami.com   → Laravel (فقط /cdn + /storage)
api.bahramrostami.com   → Laravel (/api)
```

`NEXT_PUBLIC_CDN_ORIGIN` و `MEDIA_URL` را روی `https://cdn.bahramrostami.com` بگذارید.

### Cache Rules

نمونه قوانین در:

[`docs/cloudflare-cache-rules.example.json`](cloudflare-cache-rules.example.json)

در Cloudflare Dashboard → **Caching → Cache Rules** این منطق را پیاده کنید:

1. **Bypass:** `/admin`, `/api/chatbot`, `/api/captcha`, `/purchase`, `/apply`
2. **Cache 1y:** `/_next/static/*`, `/cdn/media/*`, `/storage/media/*`
3. **Respect origin:** HTML عمومی — هدر `CDN-Cache-Control` از Next

### API Token — حداقل دسترسی

- Zone → Cache Purge
- Zone → Zone → Read
- (اختیاری) Zone Settings → Edit — برای dev mode toggle

---

## Purge خودکار

وقتی `auto_purge_on_save` و `cloudflare_auto_purge` روشن باشند:

| رویداد | ISR | Cloudflare |
|--------|-----|------------|
| ذخیره مقاله | tags + paths | URLهای `/insights/{slug}` |
| ذخیره FAQ | `/faq` | همان path |
| آپلود رسانه | tags | prefix `/cdn/media/` + `/storage/media/` |
| Purge دستی «همه» | همه tags | `purge_everything` |

پیاده‌سازی: `ContentPublishService` + `CacheService::purgeCloudflare()`.

Purge URL-based حداکثر **۳۰ URL** در هر درخواست API (batch خودکار).

---

## توسعه محلی (localhost)

در dev **Cloudflare OFF طبیعی است**:

- `localhost` پشت Cloudflare نیست
- `cdn_html_cache` می‌تواند روشن باشد ولی edge اثری ندارد
- تصاویر از `http://127.0.0.1:8010/cdn/media/...` لود می‌شوند

```env
NEXT_PUBLIC_CDN_ORIGIN=http://127.0.0.1:8010
BACKEND_PROXY_URL=http://127.0.0.1:8010
```

---

## چک‌لیست production

- [ ] DNS نارنجی (proxied) برای سایت
- [ ] `MEDIA_URL` / `NEXT_PUBLIC_CDN_ORIGIN` تنظیم
- [ ] `REVALIDATE_SECRET` یکسان در Laravel و Next
- [ ] `CacheIntegrationsSeeder` یا پنل → credentials
- [ ] پنل `/admin/cache` → پریست **متعادل** یا **حداکثر سرعت**
- [ ] `developer_mode` خاموش
- [ ] Cloudflare Cache Rules (نمونه JSON)
- [ ] تست: ذخیره مقاله → صفحه `/insights/slug` به‌روز
- [ ] تست: Purge log در پنل → «ربات» + cloudflare: true

---

## عیب‌یابی

### Cloudflare OFF در پنل

→ Zone ID یا API Token خالی است. `.env` یا Settings → Cache integrations.

### مقاله save شد ولی HTML قدیمی

1. `REVALIDATE_SECRET` یکسان؟
2. `auto_purge_on_save` روشن؟
3. `developer_mode` خاموش؟
4. Cloudflare dev mode در dashboard خاموش؟

### تصویر قدیمی بعد از آپلود

→ `revalidateMedia` باید prefix media را purge کند. `cloudflare_auto_purge` را روشن کنید.

### `CDN-Cache-Control` دیده نمی‌شود

→ `cdn_html_cache` خاموش یا `developer_mode` روشن. یا مسیر dynamic است (`/admin`).

---

## مراجع

- [DEVELOPMENT-GUIDE-SINCE-71020d2.md](DEVELOPMENT-GUIDE-SINCE-71020d2.md) — راهنمای توسعه
- [DEPLOYMENT.md](DEPLOYMENT.md) — deploy کلی
- Cloudflare: [CDN-Cache-Control](https://developers.cloudflare.com/cache/about/cdn-cache-control/)

---

*آخرین به‌روزرسانی: ۱۴۰۵/۰۴/۱۷*
