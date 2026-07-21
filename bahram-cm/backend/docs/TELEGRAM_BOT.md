# ربات تلگرام آکادمی بهرام

## معماری (Production + Worker)

```
کاربر → Telegram → Cloudflare Worker → Laravel webhook → پاسخ فوری
سرور → Cloudflare Worker → api.telegram.org → کاربر
```

Worker فقط **پل** است (ورودی/خروجی از فیلتر ایران). پردازش و منطق ربات در Laravel است.

Webhook:

`POST /api/v1/integrations/telegram/{botKey}/webhook`

- تلگرام webhook را به URL ورکر ثبت می‌کند (نه مستقیم rostami.app)
- Worker هدر `Authorization: Bearer PROXY_SHARED_TOKEN` را به Laravel اضافه می‌کند
- Laravel secret را با `X-Telegram-Bot-Api-Secret-Token` چک می‌کند
- آپدیت **همان لحظه** پردازش می‌شود (`dispatchSync`) — بدون وابستگی به صف inbound
- پاسخ‌ها با `TELEGRAM_OUTBOUND_SYNC=true` مستقیم از همان request ارسال می‌شوند

nginx مسیر webhook را مستقیم به PHP-FPM می‌فرستد (bypass Next.js) —
`deploy/nginx/rostami-app-origin.conf`

## Env

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_BOT_KEY=production
TELEGRAM_WEBHOOK_BASE_URL=https://broken-mountain-6b4f.shokspy.workers.dev
TELEGRAM_OUTBOUND_SYNC=true
PROXY_SHARED_TOKEN=
```

⚠️ عمداً یک ساب‌دامین `api.*` جدا نیست — چنین ساب‌دامین‌هایی در ایران فیلتر می‌شوند.
webhook از همان `rostami.app/api/v1/integrations/telegram/{botKey}/webhook` سرویس می‌شود؛
nginx این مسیر را مستقیم به PHP-FPM می‌فرستد (bypass از Next.js) — نمونه در
`deploy/nginx-telegram-webhook.conf.example` و پیاده‌سازی واقعی در
`../../deploy/nginx/rostami-app.conf`.

توکن ادمین (`sms_providers.telegram`) جداست و برای لاگ ادمین است.

توکن این بات (`@RostamiAppBot`) با **saat** (سات، `sat.center`) مشترک است — Mini App
"Sat Center" (`t.me/RostamiAppBot/satcenter`) با همین `TELEGRAM_BOT_TOKEN` initData
را تأیید می‌کند اما هیچ webhook خودش ثبت نمی‌کند (این پروژه مالک webhook است).

## نصب

```bash
cd bahram-cm/backend
composer install --ignore-platform-req=ext-pcntl --ignore-platform-req=ext-posix
php artisan migrate
php artisan db:seed --class=TelegramBotSeeder
php artisan telegram:sync-bots
php artisan telegram:webhook:set production
php artisan horizon
```

## Supervisor

نگاه کنید به `deploy/supervisor-telegram-horizon.conf.example`.

## Nginx

Webhook باید مستقیم به PHP-FPM برود — نمونه در `deploy/nginx-telegram-webhook.conf.example`.

## دستورات

- `telegram:webhook:set|delete|info`
- `telegram:health-check`
- `telegram:retry-failed-updates`
- `telegram:cleanup`
- `telegram:sync-bots`

## صف‌ها (اولویت)

1. telegram-replies
2. telegram-transactional
3. telegram-support
4. telegram-inbound
5. telegram-broadcast
6. telegram-maintenance
