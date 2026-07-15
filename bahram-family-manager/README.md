# مدیر خانواده بهرام (Bahram Family Manager)

اپ اندروید/iOS/Web مخصوص بهرام رستمی و ادمین‌های مجاز برای مدیریت «خانواده داداش بهرام» — همان بک‌اند Laravel پروژه اصلی (`bahram-cm/backend`) را از طریق `/api/v1/family-manager/*` صدا می‌زند؛ **هیچ سیستم auth یا دیتابیس جدایی ندارد**.

## آدرس توسعه (وب)

| چه چیزی | آدرس |
|---------|------|
| **اپ (مرورگر)** | **http://localhost:7357** |
| API (همان origin، از طریق پروکسی) | http://localhost:7357/api/v1 |
| Laravel (فقط داخلی — در مرورگر باز نکنید) | http://127.0.0.1:8010 |

> پورت **7357** ثابت است. پورت‌های تصادفی Flutter (مثل `50408`) دیگر استفاده نمی‌شوند.  
> اسکریپت `run.ps1` یک پروکسی سبک روی 7357 بالا می‌آورد: UI + `/api` هر دو از همین آدرس.

## قابلیت‌ها

- **ورود:** همان جریان ورود پنل ادمین (ایمیل/رمز → کد OTP پیامکی → توکن Sanctum)، با پشتیبانی از کپچای ریاضی اگر در تنظیمات فعال باشد.
- **خانه:** آمار امروز (پست، واکنش، نظر جدید، اکشن تکمیل‌شده، نظرات در انتظار) + خلاصه هوش مصنوعی موضوعات داغ.
- **پست‌ها:** ایجاد/ویرایش پیش‌نویس (متنی/صوتی/ویدیویی/تصویری)، آپلود رسانه با نوار پیشرفت (آپلود ساده یا Chunked برای فایل‌های بزرگ)، انتخاب مخاطب (همه/شامل/مستثنی + پیشنهاد هوشمند مخاطب)، افزودن اکشن تعاملی (تعهد/تأیید/عدد/انتخاب تکی و چندتایی/متن کوتاه/طیف امتیاز)، انتشار/آرشیو/حذف.
- **نظرات:** تب‌های در انتظار/تأییدشده/رد‌شده/مهم/خوانده‌نشده، تأیید/رد (با دلیل)، تأیید دسته‌جمعی، مهم‌کردن، افزودن به Family Pulse، پاسخ بهرام (متنی یا صوتی).
- **خانواده‌ها:** فهرست + جستجو/فیلتر lifecycle + جزئیات یک خانواده شامل DNA (تعامل صوتی/ویدیویی، نرخ واکنش/کامنت، تعهد/تکمیل اکشن).
- **تحلیل:** روند روزانه (عضو جدید، پست، واکنش، اکشن)، منابع ورودی، رویدادهای ورودی — بازه ۷/۳۰/۹۰ روزه.

هر تب فقط اگر ادمین لاگین‌شده پرمیشن `family.*` مربوطه را داشته باشد نمایش داده می‌شود (سوپرادمین همه را می‌بیند).

## ساختار پروژه

```
lib/
  main.dart, app.dart              نقطه ورود + MaterialApp/RTL/تم
  config/app_config.dart           آدرس API (قابل override با --dart-define)
  config/dev_ports.dart            پورت ثابت 7357 + پروکسی dev
  core/api/                        Dio wrapper + مدل خطا (دو شکل envelope بک‌اند)
  core/theme/, core/labels.dart    تم و لیبل‌های فارسی enum ها
  services/                        AuthService, FamilyManagerService (تمام تماس‌های API)
  models/models.dart               مدل‌های دستی JSON (بدون codegen)
  state/app_state.dart             وضعیت سراسری: نشست ورود + سرویس‌های مشترک
  features/                        auth, shell (bottom nav), home, posts, comments, families, analytics
scripts/
  run.ps1                          اجرای وب/اندروید/ویندوز
  dev-web.mjs                      پروکسی dev — یک پورت عمومی 7357
```

## راه‌اندازی

Flutter SDK در این ریپو داخل `.tools/flutter` قرار دارد. **نیازی به نصب جداگانه یا اضافه کردن به PATH نیست.**

### پیش‌نیاز: بک‌اند Laravel

```powershell
cd bahram-cm\backend
php artisan serve --port=8010
```

### اجرای سریع (Windows)

```powershell
cd bahram-family-manager
.\scripts\run.ps1              # وب — http://localhost:7357
.\scripts\run.ps1 -Target android   # موبایل / امولاتور
```

### اجرای دستی

```powershell
$flutter = "..\.tools\flutter\bin\flutter.bat"
& $flutter pub get
.\scripts\run.ps1
```

> ⚠️ اگر پلتفرم اندروید/iOS کامل نیست، یک‌بار `flutter create` بزنید:

```bash
cd bahram-family-manager
flutter create --platforms=android,ios --org com.bahram --project-name bahram_family_manager .
```

برای build نسخه Production:

```bash
flutter build apk --dart-define=API_BASE_URL=https://fashio.ir/api/v1
```

## نکات امنیتی رسانه

آپلود رسانه هرگز مسیر ذخیره‌سازی خام (`storage_path`) یا دیسک FTP را در اپ نمی‌بیند؛ فقط شناسه (`media_id`) و — در صورت آماده‌بودن — `cdn_url` از پاسخ `/family-manager/media/{id}` استفاده می‌شود. جزئیات کامل رسانه/FTP/CDN در [`../bahram-cm/docs/FAMILY.md`](../bahram-cm/docs/FAMILY.md).

## محدودیت‌های شناخته‌شده (این نسخه)

- بدون پیش‌نمایش پخش صوت/ویدیو داخل اپ (فقط نمایش وضعیت/نام فایل) — برای بازبینی محتوا کافی است، پخش کامل در فرانت وب (`/family`) انجام می‌شود.
- پست نوع «آلبوم تصویر»، «مقاله» و «ترکیبی» از این ویرایشگر ساخته نمی‌شوند (از API/پنل ادمین وب قابل انجام‌اند)؛ فقط متنی/صوتی/ویدیویی/تصویری تک‌بلوکی + کپشن.
- پیش از انتشار حتماً `flutter analyze` و `flutter test` را اجرا کنید.
