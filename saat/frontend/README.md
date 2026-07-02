# سات (Saat)

اپ موبایلی کال‌سنتر و مدیریت فروش برای تیم‌های فروش — فرانت‌اند کامل، فارسی و RTL، آماده اجرا به‌صورت Telegram Mini App یا وب‌اپ موبایل.

> این نسخه فقط فرانت‌اند است؛ همه داده‌ها mock بوده و با `localStorage` پایدار می‌شوند. بک‌اندی وجود ندارد.

## تکنولوژی‌ها

- React 18 + TypeScript
- Vite
- Tailwind CSS (سیستم رنگی اختصاصی teal/emerald)
- Framer Motion (میکرواینترکشن و ترنزیشن صفحات)
- Zustand + persist (state و ذخیره‌سازی محلی)
- React Router
- lucide-react (آیکون‌ها)
- فونت Vazirmatn

## اجرا

```bash
npm install
npm run dev      # فقط مینی‌اپ — http://localhost:5173
npm run build    # خروجی production
npm run preview  # پیش‌نمایش خروجی build
```

برای اجرای همزمان مینی‌اپ و سایت بهرام، از روت مونورپو:

```bash
cd ../..
npm run dev
```


## امکانات

- ورود mock با شماره موبایل و کد تایید (کد آزمایشی: ۱۲۳۴۵)
- خانه کارشناس با کارت «تماس بعدی آماده‌ست»
- صفحه «در حال تماس» (Dialer) با تایمر، کنترل‌ها و اسکریپت فروش
- ثبت سریع نتیجه تماس + پیشنهاد سرنخ بعدی
- لیست و جزئیات سرنخ‌ها با سرچ و فیلتر
- پیگیری‌ها و وظایف امروز / عقب‌افتاده
- گیمیفیکیشن: هدف روزانه، streak، امتیاز، نشان‌ها، لیدربورد، چالش
- viewهای مدیریتی موبایل برای نقش‌های لیدر، سوپروایزر و مدیر فروش
- تغییر نقش در حالت دمو (دکمه پایین‌چپ یا تنظیمات)
- حالت‌های Empty / Loading / Error / Offline

## ساختار

```
src/
  app/          ناوبری نقش‌محور
  components/
    ui/         کامپوننت‌های پایه (Button, Card, BottomSheet, ProgressRing, ...)
    domain/     کامپوننت‌های دامنه (LeadCard, NextCallCard, StageBar, ...)
    layout/     AppShell, BottomNav, TopBar, RoleSwitcher
  data/         mock data (لیدها، کارشناسان، گزارش‌ها، اسکریپت، لیبل‌ها)
  features/     صفحات (auth, home, leads, dialer, call, followups, ...)
  lib/          فرمت تاریخ/عدد فارسی، wrapper تلگرام، helperها
  store/        Zustand store
  types/        تایپ‌ها
```

## اتصال بعدی به بک‌اند / تلگرام

- `src/lib/telegram.ts` یک wrapper نازک روی Telegram WebApp SDK است (ready/expand/haptic). داخل تلگرام به‌صورت خودکار فعال می‌شود.
- منطق داده در `src/store/useStore.ts` متمرکز است؛ برای اتصال به API کافی است اکشن‌ها به سرویس واقعی متصل شوند.
