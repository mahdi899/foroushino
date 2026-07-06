# Bahram CM — Marketing Website

سایت عمومی بهرام رستمی (Next.js) به‌همراه API فرم‌های درخواست و خبرنامه.

## ساختار

```
app/          صفحات Next.js
components/   کامپوننت‌های UI
content/      محتوای MDX (دوره‌ها، مقالات، رویدادها، …)
backend/      FastAPI — فرم Apply و Newsletter
docs/         راهنمای deploy و چک‌لیست‌ها
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

**پنل مدیریت (Filament)** از همان دامنه سایت در دسترس است — نیازی به باز کردن پورت بک‌اند نیست:

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

- **Frontend:** Vercel یا هر هاست Node — روت پروژه همین پوشه
- **Backend:** هر سرور Python — `backend/` با MySQL + Redis

## Companion

صفحه `/companion` به API اصلی Academy (اپ موبایل) وابسته است. اگر فقط سایت مارکتینگ را deploy می‌کنید، `NEXT_PUBLIC_API_BASE_URL` را به همان API اصلی تنظیم کنید یا این صفحه را غیرفعال نگه دارید.

## License

Private. All rights reserved.
