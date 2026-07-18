# خانواده داداش بهرام — Family System

سیستم «خانواده داداش بهرام» یک **Modular Monolith** داخل همان بک‌اند Laravel موجود (`backend/`) است — نه یک سرویس یا دیتابیس جدا. هدف: فضای نزدیک و شخصی‌شده‌ی بهرام رستمی با اعضا، در قالب خانواده‌های ۵٬۰۰۰ نفره، با پست‌های متنی/صوتی/ویدیویی/تصویری، واکنش، کامنت مدیریت‌شده، اکشن (تعهد/تأیید/نظرسنجی) و تحلیل هوش مصنوعی غیربحرانی.

## فهرست
1. [معماری](#معماری)
2. [مدل داده](#مدل-داده)
3. [API (کاربر / مدیر)](#api)
4. [صف‌ها (Queues)](#صفها)
5. [رسانه: FTP + CDN](#رسانه)
6. [متغیرهای محیطی](#متغیرهای-محیطی)
7. [استقرار Production](#استقرار-production)
8. [Manager App (Flutter)](#manager-app)
9. [محدودیت‌های شناخته‌شده / کارهای بعدی](#محدودیتها)

---

## معماری

```
bahram-cm/backend/
  app/Models/Family*.php                 مدل‌ها (flat، هم‌راستا با بقیه پروژه)
  app/Enums/Family/                      Enum های Backed String
  app/Services/Family/                   منطق دامنه (Assignment, Feed, Stats, Publisher, Ingest, Intelligence, ...)
  app/Actions/Family/JoinFamily.php      اکشن پیوستن
  app/Http/Controllers/Api/V1/Family/          کنترلرهای سمت کاربر (عضو/مهمان)
  app/Http/Controllers/Api/V1/FamilyManager/   کنترلرهای مدیر (بهرام + ادمین‌های مجاز)
  app/Http/Resources/V1/Family/          API Resources
  app/Jobs/Family/                       صف‌ها (FTP transfer, AI, follow-up, analytics rollup)
  app/Http/Middleware/EnsureUserCanManageFamily.php   گارد family.manage
  config/family.php                      تنظیمات کامل (ظرفیت، رسانه، صف، rate limit, onboarding)
  database/migrations/2026_07_14_1000*_*.php

bahram-cm/frontend/
  app/family/                            مسیر /family (Bare-shell — بدون نوبار/فوتر سایت)
  components/family/                     کامپوننت‌های ترکیب پست، پلیر صوت/ویدیو، اکشن، کامنت
  lib/family/                            Server Actions (api.ts), session.ts (توکن مشترک با پنل دانشجویی), hooks
  components/sections/FamilyPulseSection.tsx   بخش صفحه اصلی

bahram-family-manager/                   اپ Flutter مدیر (Android + iOS) — بخش Manager App را ببینید
```

**اصل کلیدی:** یوزر Family همان `User` موجود پروژه است (OTP موبایل، Sanctum Bearer Token). عضویت با جدول `family_memberships` (یکتا روی `user_id`) مدل می‌شود؛ هیچ سیستم auth موازی ساخته نشده.

---

## مدل داده

| جدول | توضیح |
|---|---|
| `families` | خانواده (نام داخلی، ظرفیت، lifecycle: forming/active/cooling/dormant) |
| `family_entry_events` | کمپین/سمینار/ریلی که کاربر از آن وارد شده |
| `family_memberships` | عضویت کاربر در خانواده (UNIQUE user_id) |
| `family_posts` / `family_post_blocks` / `family_post_targets` | پست‌ها، بلوک‌های ترکیبی، هدف‌گیری مخاطب |
| `family_media` / `family_media_upload_sessions` | رسانه (FTP)، آپلود Chunked |
| `family_reactions` / `family_comments` / `family_post_stats` | تعامل + Read Model آماری |
| `family_actions` / `family_action_options` / `family_action_responses` | اکشن‌های تعاملی |
| `family_media_progress` / `family_user_behavior_profile` / `family_dna_snapshots` | تحلیل رفتاری (Rebuildable) |
| `family_daily_metrics` / `family_source_daily_metrics` / `family_entry_event_daily_metrics` | Read Model روزانه برای داشبورد |

جزئیات کامل ستون‌ها در فایل‌های مایگریشن `database/migrations/2026_07_14_1000*.php`.

---

## API

Base: `/api/v1/family` (کاربر/مهمان) و `/api/v1/family-manager` (مدیر).

### کاربر / مهمان (`/api/v1/family`)

| Method | Path | Auth | توضیح |
|---|---|---|---|
| GET | `/feed` | اختیاری | مهمان → پیش‌نمایش عمومی؛ عضو → فید کامل با cursor pagination |
| GET | `/posts/{post}` | اختیاری | یک پست |
| GET | `/pulse` | عمومی | نمونه کامنت‌های تأییدشده برای صفحه اصلی |
| POST | `/join` | لازم | پیوستن (Idempotent) |
| POST | `/onboarding/complete` | لازم | تکمیل خوش‌آمدگویی |
| GET | `/me` | لازم | وضعیت عضویت |
| PUT/DELETE | `/posts/{post}/reaction` | لازم | ثبت/حذف واکنش |
| GET/POST | `/posts/{post}/comments` | لازم | فهرست/ارسال کامنت (Pending تا تأیید) |
| POST | `/actions/{action}/respond` | لازم | پاسخ به اکشن |
| POST | `/media-progress` | لازم | تلمتری پخش رسانه |
| GET/POST | `/notifications*` | لازم | اعلان‌های Family (روی سیستم اعلان مشترک) |

> ⚠️ چون `/feed` و `/posts/{post}` بیرون از گروه `auth:sanctum` هستند (برای مهمان هم باز باشند)، کنترلر عمداً `$request->user('sanctum')` صدا می‌زند نه `$request->user()` — در غیر این صورت گارد پیش‌فرض (`web`/session) توکن Bearer را نمی‌بیند.

### مدیر (`/api/v1/family-manager` — `auth:sanctum` + `admin` + `family.manage:<permission>`)

| Method | Path | Permission |
|---|---|---|
| GET | `/home` | `family.analytics.view` |
| GET/POST | `/posts`, `/posts/{post}` | `family.posts.create` |
| POST | `/posts/{post}/publish` \| `/archive` | `family.posts.publish` |
| POST | `/posts/{comment}/reply` | `family.comments.reply` |
| GET | `/comments` (tabs: pending/approved/rejected/important/unread) | `family.comments.moderate` |
| POST | `/comments/{comment}/approve` \| `/reject` \| `/batch-approve` | `family.comments.moderate` |
| POST | `/comments/{comment}/pulse` | `family.pulse.manage` |
| GET | `/families`, `/families/{family}`, `/audience-suggestions` | `family.families.view` |
| GET | `/analytics`, `/analytics/daily-summary` | `family.analytics.view` |
| POST | `/media`, `/media/sessions*` | `family.media.upload` |

پرمیشن‌ها در `App\Support\FamilyPermissionCatalog` تعریف و به نقش `family_manager` (و `admin`) در `RolePermissionSeeder` سید می‌شوند.

---

## صف‌ها

| Queue | مصرف‌کننده |
|---|---|
| `family-high` | (رزرو برای پخش فوری اعلان مهم) |
| `family-media` | `TransferFamilyMediaToFtpJob`, `Process*Job`, `Generate*Job`, `CleanupFamilyTemporaryMediaJob` |
| `family-ai` | `AnalyzeFamilyCommentJob` |
| `family-notifications` | `ProcessActionFollowUpJob` |
| `family-analytics` | `AggregateFamilyDailyMetricsJob`, `RebuildFamilyBehaviorProfilesJob`, `CalculateFamilyDnaSnapshotJob` (هر سه در `routes/console.php` زمان‌بندی شده‌اند) |
| `family-low` | (رزرو) |

Worker مجزا: `deploy/supervisor/bahram-family-queue.conf` (تا رسانه‌های سنگین صف اصلی سفارش/نوتیفیکیشن سایت را کند نکنند).

---

## رسانه

**قانون سخت:** رسانه Family هیچ‌وقت از سرور اصلی Laravel پخش نمی‌شود.

1. آپلود (ساده یا Chunked) → دیسک `local` موقت (`family.media.temp_disk`).
2. `TransferFamilyMediaToFtpJob` فایل را به دیسک `family_media_ftp` (Flysystem FTP، `config/filesystems.php`) منتقل می‌کند.
3. آدرس نهایی که به کلاینت داده می‌شود همیشه از `FamilyMediaUrl::fromPath()` می‌آید: `FAMILY_MEDIA_CDN_URL + storage_path` — یعنی از یک CDN که از همان FTP Host پول می‌کند، **نه** از دامنه Laravel.
4. تا وقتی `status != ready`، `url` در پاسخ API `null` است و فرانت placeholder «در حال پردازش» نشان می‌دهد.
5. انتشار پست (`FamilyPostPublisher::publish`) قبل از تغییر `status` به `published`، تمام رسانه‌های بلوک‌ها را چک می‌کند و اگر یکی `READY` نباشد خطای ۴۲۲ (`media_not_ready`) برمی‌گرداند.

نصب adapter: `composer require league/flysystem-ftp` (به `composer.json` اضافه شده — روی محیطی که این session اجرا شد `composer update` قابل اجرا نبود؛ **قبل از دیپلوی حتماً اجرا شود**).

---

## متغیرهای محیطی

همه در `backend/.env.example` بخش «Family» مستند شده‌اند: ظرفیت خانواده، اتصال FTP، `FAMILY_MEDIA_CDN_URL`، محدودیت حجم رسانه، rate limit ها.

**Option B — دو دامنه واقعی:** Family PWA روی apex مستقل `rostami.club` سرو می‌شود (نه زیرمسیر سایت اصلی). `FAMILY_ENTRY_BASE_URL=https://rostami.club` و `FAMILY_ENTRY_PATH=` (خالی) باید در `.env` تنظیم شوند. جزئیات کامل معماری دو-دامنه‌ای، rewrite داخلی، و SSO یک‌بارمصرف بین `rostami.app` ↔ `rostami.club` در [`DEPLOYMENT.md`](DEPLOYMENT.md) است. در local dev اگر این متغیرها را ست نکنید (یا `NEXT_PUBLIC_APP_DOMAIN`/`NEXT_PUBLIC_FAMILY_DOMAIN` در فرانت خالی بماند)، رفتار قدیمی/تک‌دامنه‌ای (`/family` به‌عنوان یک مسیر عادی) بدون تغییر کار می‌کند.

### Realtime (Laravel Reverb) — بج هدر و فید

پیش‌فرض `BROADCAST_CONNECTION=null` است؛ اپ بدون WebSocket با polling HTTP کار می‌کند.

برای فعال‌سازی محلی:

1. در `backend/.env`:
   ```
   BROADCAST_CONNECTION=reverb
   REVERB_APP_ID=bahram
   REVERB_APP_KEY=bahram-reverb-key
   REVERB_APP_SECRET=bahram-reverb-secret
   REVERB_HOST=localhost
   REVERB_PORT=8080
   REVERB_SCHEME=http
   REVERB_SERVER_HOST=0.0.0.0
   REVERB_SERVER_PORT=8080
   ```
2. در `frontend/.env.local` همان کلید عمومی:
   ```
   NEXT_PUBLIC_REVERB_APP_KEY=bahram-reverb-key
   NEXT_PUBLIC_REVERB_HOST=localhost
   NEXT_PUBLIC_REVERB_PORT=8080
   NEXT_PUBLIC_REVERB_SCHEME=http
   ```
3. کنار Laravel: `php artisan reverb:start`
4. انتشار یک پست → بج «خانواده» و فید بدون رفرش صفحه به‌روز می‌شوند.

کانال عمومی `family.feed` (مهمان هم می‌بیند). اعلان شخصی روی `private-user.{id}` با auth از `/api/broadcasting/auth` (Bearer از کوکی دانشجو).

### کش سرور (۱۰–۲۰ هزار کاربر)

در production **`CACHE_STORE=redis`** الزامی است (نه `database` / `file`).

| کلید | TTL | نقش |
|------|-----|-----|
| `family:feed:version:{familyId}` | — | نسخه tip فید هر خانواده |
| `family:feed:tip:{familyId}:{limit}:v{N}` | ~۸s | صفحه اول فید (اسکلت مشترک) |
| `family:unread:{familyId}:{afterId}:v{N}` | ~۴۵s | badge خوانده‌نشده |
| `family:meta:{familyId}` | ~۳۰s | latest_post_id، feed_revision، branding_version |
| `family:branding:public` | ~۵min | نام و آواتار |

با publish پست فقط خانواده‌های هدف invalidate می‌شوند (`FamilyMetaCacheService::familyIdsAffectedByPost`). مرورگر کش بخشی دارد (`lib/family/browserCache.ts`).

---

## استقرار Production

علاوه بر مراحل `DEPLOYMENT.md` عمومی:

1. **دیتابیس:** `php artisan migrate --force` مایگریشن‌های `2026_07_14_1000*` را اجرا می‌کند.
2. **Composer:** `composer install` باید `league/flysystem-ftp` را نصب کند (اضافه‌شده به `composer.json`).
3. **Storage FTP:** مقادیر `FAMILY_MEDIA_FTP_*` و `FAMILY_MEDIA_CDN_URL` را در `.env` تنظیم کنید؛ CDN باید Origin را به همان FTP Host اشاره دهد (پیکربندی CDN provider خارج از دامنه این پروژه — طبق مستندات ARVAN-CDN.md یا provider مشابه).
4. **Queue Worker:**
   ```bash
   sudo cp deploy/supervisor/bahram-family-queue.conf /etc/supervisor/conf.d/
   sudo supervisorctl reread && sudo supervisorctl update
   sudo supervisorctl status bahram-family-queue:*
   ```
5. **Scheduler:** جاب‌های Analytics از طریق `Schedule::job()` در `routes/console.php` ثبت شده‌اند و با کرون عمومی پروژه (`php artisan schedule:run`) کار می‌کنند — چیز اضافه‌ای لازم نیست.
6. **Seed پرمیشن:** `php artisan db:seed --class=RolePermissionSeeder` (idempotent) تا نقش `family_manager` و پرمیشن‌های `family.*` ساخته شوند.
7. **نقش بهرام:** یک اکانت ادمین موجود را نقش `super_admin` یا `family_manager` بدهید تا به `/family-manager/*` و اپ Flutter دسترسی داشته باشد.

---

## Manager App

اپ Flutter مدیر (`bahram-family-manager/`، Provider + Dio، Android + iOS + Web) با همان API بک‌اند کار می‌کند و از همان لاگین ادمین (ایمیل/رمز → OTP پیامکی، با کپچای اختیاری) استفاده می‌کند — بدون سیستم Auth جدا. پوشش فعلی: خانه (آمار روزانه + خلاصه AI)، پست‌ها (ساخت/ویرایش/انتشار/آرشیو + آپلود رسانه ساده/Chunked + مخاطب‌گیری + اکشن تعاملی)، نظرات (تب‌های وضعیت + تأیید/رد/پاسخ بهرام)، خانواده‌ها (فهرست/جستجو/DNA)، تحلیل (روند روزانه/منابع/رویدادها). ناوبری پایین بر اساس پرمیشن‌های `family.*` کاربر لاگین‌شده فیلتر می‌شود.

### توسعه وب (پورت ثابت)

| آدرس | نقش |
|------|-----|
| http://localhost:7357 | **تنها آدرسی که در مرورگر باز می‌کنید** (UI + API از همان origin) |
| http://127.0.0.1:8010 | Laravel — فقط داخلی؛ `php artisan serve --port=8010` |

```powershell
cd bahram-family-manager
.\scripts\run.ps1
```

جزئیات: [`../../bahram-family-manager/README.md`](../../bahram-family-manager/README.md).

> این پروژه با `flutter create` اسکافولد نشده (Flutter SDK در محیط توسعه‌دهنده در دسترس نبود)؛ فایل‌های Android به‌صورت دستی نوشته شده‌اند. پیش از اولین اجرا مراحل «راه‌اندازی» در README همان پروژه (اجرای یک‌بارهٔ `flutter create` برای تولید gradle wrapper/`ios/`) و سپس `flutter analyze` + `flutter test` را انجام دهید.

---

## محدودیت‌ها

- `FamilyIntelligenceService` هیچ‌وقت مسیر انتشار/تأیید پست را بلاک نمی‌کند؛ در صورت خطای AI یا نبود تنظیمات، به heuristic ساده (regex فارسی) سقوط می‌کند.
- `family_post_stats` یک Read Model است؛ `FamilyStatsService::rebuildForPost()` برای بازسازی در صورت Drift موجود است.
- محدودیت واقعی سیستم: این پیاده‌سازی روی SQLite (تست) و MySQL (Production) هر دو باید کار کند — از `DB::raw` با سینتکس اختصاصی MySQL (مثل `GREATEST`) اجتناب شده؛ در صورت افزودن Query خام جدید همین قاعده را رعایت کنید.

گزارش نهایی تولید/تست/hardening: [`docs/reports/family-production-report.md`](reports/family-production-report.md).
