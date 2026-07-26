# معماری هاست خارج — ربات کامل

## اصل طراحی

```
┌─────────────────────────────────────────────────────────────┐
│  هاست خارج (cPanel + PHP + MySQL)                           │
│  • webhook + ack سریع (fastcgi_finish_request)              │
│  • منو، کاتالوگ، خرید، تخفیف، زرین‌پال → محلی             │
│  • عضویت کانال → getChatMember محلی                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
    کش (cron ۵ دقیقه)                  delegate/API زنده
          │                                 │
          ▼                                 ▼
   bootstrap, catalog              ثبت‌نام، C2C رسید، SAT،
   messages, flags                 پشتیبانی+رسانه، ادمین، گروه
                                          │
                                          ▼
                              سرور ایران (Laravel کامل)
```

## مسیریابی UpdateRouter

| شرط | مقصد |
|-----|------|
| کاربر تأییدنشده | delegate (ثبت‌نام ۱۰۰٪ Laravel) |
| ادمین ربات | delegate |
| گروه / chat_member | delegate |
| state: C2C receipt, SAT, support | delegate |
| callback reg: / c2c:ok/no | delegate |
| کاربر عادی verified | handlers محلی |

## دادهٔ کاربر (آینه روی هاست خارج)

| محل | چه چیزی |
|-----|---------|
| **MySQL هاست** | `telegram_accounts_cache` — هویت، لیست محصولات خریداری‌شده، متن «حساب من»، خانواده، معرفی، صفحهٔ دسترسی به دوره |
| **سرور ایران** | منبع حقیقت (کاربر سایت، سفارش، دسترسی دوره) |
| **Push** | بعد از ثبت‌نام، ویرایش حساب تلگرام، تکمیل سفارش → `push_account` (اگر از ایران به هاست برسد) |
| **Pull** | هر وب‌هوک (حداکثر هر ~۳ دقیقه برای هر کاربر) → `account/fetch` + snapshot |
| **Cron** | `pull-sync.php` — کاتالوگ و bootstrap (نه تک‌تک کاربران) |

### بدون ایران چه کار می‌کند؟
منو، کاتالوگ، «حساب من»، خانواده، معرفی، نمایش دورهٔ خریداری‌شده (از کش)، عضویت کانال.

### هنوز به ایران نیاز دارد
ثبت‌نام/OTP، پرداخت (زرین‌پال/C2C)، پشتیبانی زنده، سات، ادمین، ظرفیت سمینار لحظه‌ای، تخفیف هنگام خرید.


- `process-update` — delegate کامل
- `checkout/c2c/start` — سفارش + beginWaitingForReceipt روی سرور
- `support/prepare` — sync state پشتیبانی
- `support/try-reply` — ادامه thread پشتیبانی
- `product/present` — نمایش محصول + عکس
- `referral/summary`, `family/summary`, `sat/open`, …

## وضعیت

| بخش | وضعیت |
|-----|--------|
| ثبت‌نام کامل (قوانین، OTP، نام، start_payload) | ✅ delegate |
| منو + خرید + تخفیف + زرین‌پال | ✅ محلی |
| C2C + رسید عکس | ✅ سرور (state مشترک) |
| پشتیبانی متن/رسانه/reply | ✅ سرور |
| سات / خانواده / معرفی | ✅ API زنده |
| عکس کاتالوگ | ✅ |
| پنل ادمین | ✅ delegate |
| bot غیرفعال | ✅ |

## deploy

1. deploy سرور ایران (routes + LiveController)
2. آپلود `telegram/` + migrate DB
3. `php cron/pull-sync.php`
4. ثبت webhook از پنل ادمین
