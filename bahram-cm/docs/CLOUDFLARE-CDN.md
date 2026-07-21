# راهنمای CDN — rostami.app + Cloudflare

## معماری (الزامی)

```
کاربر → Cloudflare Edge → rostami.app (Nginx → Next.js :3000)
                              ↓ server-side فقط
                         127.0.0.1:8010 Laravel
                              ↓
                         cdn.rostami.app → /storage, /cdn (رسانه)
```

### قوانین مهم

1. **دامنه عمومی:** فقط `https://rostami.app` — مرورگر همه `/api/*` را از همین origin می‌گیرد (Next.js proxy).
2. **Laravel عمومی نیست:** `api.rostami.app` یا IP مستقیم را **باز نکنید** — در ایران فیلتر/بلاک می‌شود.
3. **ارتباط داخلی:** `BACKEND_PROXY_URL=http://127.0.0.1:8010` (یا شبکه private).
4. **رسانه:** `https://cdn.rostami.app` پشت Cloudflare — فقط فایل استاتیک.

---

## متغیرهای Production

### Frontend (`.env.local` روی سرور)

```env
NEXT_PUBLIC_SITE_URL=https://rostami.app
NEXT_PUBLIC_API_BASE_URL=https://rostami.app
BACKEND_PROXY_URL=http://127.0.0.1:8010
NEXT_PUBLIC_CDN_ORIGIN=https://cdn.rostami.app
REVALIDATE_SECRET=<random-64>

NEXT_PUBLIC_APP_DOMAIN=rostami.app
NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club
```

### Backend (`.env`)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://127.0.0.1:8010
FRONTEND_URL=https://rostami.app
CORS_ALLOWED_ORIGINS=https://rostami.app,https://rostami.club
MEDIA_URL=https://cdn.rostami.app
CDN_PROVIDER=cloudflare
CLOUDFLARE_ZONE_ID=<zone-id>
CLOUDFLARE_API_TOKEN=<token با Cache Purge + Zone Read>
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
TRUSTED_PROXIES=127.0.0.1
REVALIDATE_WEBHOOK_URL=https://rostami.app/api/revalidate
```

---

## تنظیمات Cloudflare

### ۱. DNS

| رکورد | نوع | مقدار | Proxy |
|--------|-----|--------|-------|
| `@` | A | IP سرور origin | ☁️ Proxied |
| `www` | CNAME | `rostami.app` | ☁️ Proxied |
| `cdn` | A/CNAME | همان IP | ☁️ Proxied |

`rostami.club` و `family-cdn.rostami.club` را جداگانه در همان Zone یا Zone دوم تنظیم کنید (مطابق [`DEPLOYMENT.md`](DEPLOYMENT.md)).

### ۲. SSL/TLS

- حالت: **Full (strict)** اگر روی origin گواهی Let's Encrypt دارید (`rostami-app.conf`)
- یا **Full** با `rostami-app-origin.conf` (HTTP روی origin، HTTPS در لبه)

### ۳. Cache Rules

نمونه آماده: [`cloudflare-cache-rules.example.json`](cloudflare-cache-rules.example.json)

**اعمال با API (ترجیحی):**

```bash
# در bahram-cm/deploy/deploy.env یا محیط:
# CLOUDFLARE_ZONE_ID=...
# CLOUDFLARE_API_TOKEN=...   # Zone → Cache Rules → Edit + Zone → Read

cd bahram-cm/deploy/scripts
python apply-cloudflare-cache-rules.py
```

یا دستی در Dashboard → **Caching → Cache Rules** (ترتیب مهم است — Bypass اول):

| مسیر | کش | TTL |
|------|-----|-----|
| `/panel`, `/admin`, `/family`, `/api/*`, `/purchase` | Bypass | — |
| `cdn.rostami.app/media/*`, `/_next/static/*` | Cache | 1 سال |
| HTML عمومی (`/`, `/insights`, `/courses`, `/seminars`, …) | Eligible + Respect `CDN-Cache-Control` | از origin |

بعد از اعمال، باید ببینید:

```bash
curl -sI https://rostami.app/ | grep -i cf-cache
# درخواست اول: MISS یا EXPIRED
# درخواست دوم: HIT
```

### ۴. API Token (حداقل دسترسی)

- Zone → Cache Purge
- Zone → Zone → Read
- (اختیاری) Zone Settings → Edit — برای dev mode toggle از پنل

---

## Nginx روی origin

اسکریپت deploy این فایل‌ها را نصب می‌کند:

| فایل | نقش |
|------|-----|
| `deploy/nginx/conf.d/cloudflare-real-ip.conf` | `set_real_ip_from` + `CF-Connecting-IP` |
| `deploy/nginx/conf.d/rostami-upstreams.conf` | upstreamها + map IP واقعی |
| `deploy/nginx/rostami-app-origin.conf` | HTTP پشت Cloudflare (پیش‌فرض bootstrap) |

---

## پنل ادمین

### `/admin/settings` → کش و زیرساخت

1. **ارائه‌دهنده CDN:** Cloudflare
2. **Zone ID** + **API Token**
3. دکمه **تست Cloudflare**

### `/admin/cache`

- پریست **متعادل** یا **حداکثر سرعت** → `cdn_html_cache` + `cdn_auto_purge` روشن
- `developer_mode` خاموش در production

---

## Purge خودکار

وقتی `auto_purge_on_save` و `cdn_auto_purge` روشن باشند، Laravel پس از save محتوا:

1. ISR webhook به Next.js
2. Purge URL در Cloudflare (حداکثر ۳۰ URL در هر batch)

---

## عیب‌یابی

| مشکل | راه‌حل |
|------|--------|
| Cloudflare OFF در پنل | `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN` در `.env` یا پنل |
| HTML قدیمی بعد از save | `REVALIDATE_SECRET` یکسان؟ `cdn_auto_purge` روشن؟ |
| IP اشتباه در لاگ | `cloudflare-real-ip.conf` نصب شده؟ `nginx -t` |
| تصویر قدیمی | purge media prefix — `/admin/cache` → Purge CDN |

---

## مراجع

- [CDN-DEPLOYMENT.md](CDN-DEPLOYMENT.md) — معماری چندلایه کش
- [ARVAN-CDN.md](ARVAN-CDN.md) — اگر هنوز از آروان استفاده می‌کنید
- Cloudflare: [CDN-Cache-Control](https://developers.cloudflare.com/cache/about/cdn-cache-control/)
