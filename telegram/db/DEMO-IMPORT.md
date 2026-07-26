# دمو — import دیتابیس ربات روی هاست

برای تست منو و پیام‌ها بدون وابستگی کامل به API ثبت شماره:

## ۱. ساخت فایل روی سرور ایران

```bash
cd /var/www/bahram-cm/backend
php artisan telegram:export-host-database
# فقط یک کاربر (telegram user id خودتان):
php artisan telegram:export-host-database --user=123456789
```

خروجی پیش‌فرض: `storage/app/telegram-host-demo.sql`

## ۲. import روی cPanel

1. یک‌بار `schema.sql` را import کنید (اگر جدول ندارید).
2. در phpMyAdmin همان دیتابیس ربات → Import → فایل `telegram-host-demo.sql`.
3. فایل‌های PHP جدید `telegram/` را آپلود کنید (به‌خصوص `HostRegistrationFlow` و `AccountSyncCoordinator`).

## ۳. بعد از import

- `/start` باید منو را از کش محلی نشان دهد اگر `telegram_user_id` شما در dump بود و `mobile_verified_at` پر است.
- ارسال مجدد contact برای همان کاربر تأییدشده → مستقیم منو (بدون API `registration/contact`).
- کاربر جدید / ثبت‌نام تازه هنوز به API ایران نیاز دارد.

## به‌روزرسانی دوره‌ای

بعد از تغییر پیام‌ها یا کاتالوگ در پنل، دوباره `telegram:export-host-database` بزنید و import کنید (جداول `bot_messages` و catalog پاک و پر می‌شوند).
