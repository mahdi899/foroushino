# Bahram CM — Marketing Website

سایت عمومی بهرام رستمی (Next.js) به‌همراه API فرم‌های درخواست و خبرنامه.

## ساختار

```
app/          صفحات Next.js
components/   کامپوننت‌های UI
content/      محتوای MDX (دوره‌ها، مقالات، رویدادها، …)
backend/      FastAPI — فرم Apply و Newsletter
docs/         راهنمای deploy، چک‌لیست‌ها، و [راهنمای توسعه از 71020d2](docs/DEVELOPMENT-GUIDE-SINCE-71020d2.md)
public/       رسانه و فونت‌ها
```

## پیش‌نیاز

- Node.js 20+
- Python 3.11+ (برای backend فرم‌ها)
- MySQL 8 و Redis (برای backend)

## Frontend

```bash
cp .env.example .env.local
npm ci
npm run dev
```

سایت روی <http://localhost:3000> بالا می‌آید.

**پنل مدیریت** از همان دامنه سایت در دسترس است:

| | آدرس |
|--|------|
| ورود پنل | <http://localhost:3000/admin/login> |
| داشبورد | <http://localhost:3000/admin> |

کاربر پیش‌فرض (بعد از `php artisan db:seed` در `backend/`):  
ایمیل `admin@bahram.local` — رمز `password`

در `.env.local` فرانت‌اند، `BACKEND_PROXY_URL` آدرس داخلی Laravel است (مثلاً `http://127.0.0.1:8010`) و API از همان origin سایت (`/api/...`) پروکسی می‌شود.

```bash
npm run verify   # lint + typecheck + validate images/imports
npm run build
npm start
```

## Backend (فرم‌ها)

```bash
cd backend
cp .env.example .env
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

در `.env.local` فرانت‌اند:

```
BACKEND_PROXY_URL=http://127.0.0.1:8010
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Deploy

جزئیات در [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).  
**مهاجرت به IP/سرور جدید:** [`SERVER-MIGRATION.md`](docs/SERVER-MIGRATION.md)  
**ارتقای PHP 8.3 → 8.4 روی سرور موجود:** `sudo bash deploy/scripts/upgrade-php-8.4.sh`

**CDN (rostami.app / Cloudflare):** [`docs/CLOUDFLARE-CDN.md`](docs/CLOUDFLARE-CDN.md) — جایگزین آروان: [`docs/ARVAN-CDN.md`](docs/ARVAN-CDN.md)

**خانواده داداش بهرام (Family):** [`docs/FAMILY.md`](docs/FAMILY.md) — برای بج/فید realtime: `BROADCAST_CONNECTION=reverb` + `php artisan reverb:start`. در production حتماً `CACHE_STORE=redis` (کش فید، unread و meta).

- **Frontend:** Vercel یا هر هاست Node — روت `bahram-cm/frontend`
- **Backend:** Laravel — `bahram-cm/backend` با MySQL + Redis

## Companion

صفحه `/companion` به API اصلی Academy (اپ موبایل) وابسته است. اگر فقط سایت مارکتینگ را deploy می‌کنید، `NEXT_PUBLIC_API_BASE_URL` را به همان API اصلی تنظیم کنید یا این صفحه را غیرفعال نگه دارید.

## همگام‌سازی کتابخانه رسانه (تیم)

فایل‌های تصویر در `backend/storage/app/public/media/` داخل git track می‌شوند. متادیتا (alt، دسته‌بندی، …) در `backend/database/data/media_library.json` نگه‌داری می‌شود.

**بعد از `git pull` (هم‌تیمی‌ها):**

```bash
cd backend
php artisan storage:link
php artisan media:sync
```

**بعد از آپلود تصویر جدید در پنل (قبل از commit):**

```bash
cd backend
php artisan media:sync --export
git add storage/app/public/media database/data/media_library.json frontend/lib/media/legacyMap.generated.ts
```

## import خریداران سمینار (تیم)

خروجی CSV ووکامرس در `backend/database/data/woocommerce-seminar-orders-2026-07-10.csv` داخل git track می‌شود. دستور import **idempotent** است — اجرای مجدد رکورد تکراری نمی‌سازد.

**بعد از `git pull` (هم‌تیمی‌ها):**

```bash
cd backend
php artisan migrate
php artisan db:seed          # سمینار + مینی‌دوره‌ها + محصول را می‌سازد
php artisan seminar:import-orders
php artisan media:sync       # تصاویر کاور مینی‌دوره‌ها و کتابخانه رسانه
```

فقط تست بدون ذخیره:

```bash
php artisan seminar:import-orders --dry-run
```

فایل CSV دیگر:

```bash
php artisan seminar:import-orders path/to/orders.csv
```

## import لایسنس‌های دوره کمپین‌نویسی (تیم)

لایسنس‌های واقعی فقط در دیتابیس (`spotplayer_licenses`) نگهداری می‌شوند — **CSV/XLSX را در git commit نکنید.**

Import از فایل محلی (idempotent):

```bash
cd backend
php artisan campaign:import-licenses path/to/licenses.csv
php artisan campaign:import-licenses path/to/licenses.csv --dry-run
```

تبدیل XLSX پنل SpotPlayer به CSV محلی (خارج از git):

```bash
php scripts/export-spotplayer-licenses-csv.php path/to/licenses.xlsx path/to/licenses.csv
```

## License

Private. All rights reserved.
