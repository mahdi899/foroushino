# ربات تلگرام آکادمی بهرام

## معماری

Webhook مستقیم به Laravel (بدون proxy از Next.js):

`POST /api/v1/integrations/telegram/{botKey}/webhook`

هدر اجباری: `X-Telegram-Bot-Api-Secret-Token`

پردازش: ذخیره `telegram_updates` → صف `telegram-inbound` → Router → Handlers → سرویس‌های دامنه.

## Env

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_BOT_KEY=production
TELEGRAM_STAGING_BOT_TOKEN=
TELEGRAM_STAGING_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_BASE_URL=https://api.fashio.ir
```

توکن ادمین (`sms_providers.telegram`) جداست و برای لاگ ادمین است.

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
