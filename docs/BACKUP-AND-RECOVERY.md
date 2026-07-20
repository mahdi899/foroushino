# بکاپ و بازیابی — راهنمای کامل

این سند وضعیت فعلی بکاپ هر سایت در مونورپو `foroushino`، محدودیت‌های پنل ادمین، نقش **Family**، و دستورالعمل ریکاوری سریع را پوشش می‌دهد.

**دامنه‌ها**

| سایت | دامنه | مسیر کد |
|------|-------|---------|
| بهرام (سایت + پنل ادمین) | `rostami.app` | `bahram-cm/` |
| خانواده | `rostami.club` | همان `bahram-cm/` (ماژول Family) |
| سات (کال‌سنتر) | `sat.center` | `saat/` |

---

## فهرست

1. [خلاصه مقایسه‌ای](#۱-خلاصه-مقایسه‌ای)
2. [بهرام — بکاپ سرور (cron)](#۲-بهرام--بکاپ-سرور-cron)
3. [بهرام — بکاپ از پنل ادمین](#۳-بهرام--بکاپ-از-پنل-ادمین)
4. [Family — آیا بکاپ جدا لازم است؟](#۴-family--آیا-بکاپ-جدا-لازم-است)
5. [سات — بکاپ و rollback](#۵-سات--بکاپ-و-rollback)
6. [سات — بکاپ از پنل ادمین](#۶-سات--بکاپ-از-پنل-ادمین)
7. [بکاپ `.env` و secrets](#۷-بکاپ-env-و-secrets)
8. [بکاپ off-site (خارج از سرور)](#۸-بکاپ-off-site-خارج-از-سرور)
9. [ریکاوری سریع — cheat sheet](#۹-ریکاوری-سریع--cheat-sheet)
10. [تست بکاپ](#۱۰-تست-بکاپ)
11. [عیب‌یابی](#۱۱-عیب‌یابی)

---

## ۱. خلاصه مقایسه‌ای

| قابلیت | بهرام (cron) | بهرام (پنل) | Family | سات (cron) | سات (deploy) | سات (پنل) |
|--------|--------------|-------------|--------|------------|--------------|-----------|
| بکاپ DB روزانه | ✅ ساعت ۳ | ✅ زمان‌بندی اختیاری | ✅ (همان DB) | ✅ ساعت ۳ | ✅ قبل از deploy | ✅ دستی/زمان‌بندی |
| بکاپ media/فایل | ✅ هفتگی | ✅ ZIP دستی | ⚠️ FTP جدا | ✅ هفتگی | ✅ هر deploy | ✅ ZIP دستی |
| Rollback یک‌کلیک | ❌ | ❌ (import دستی DB) | — | ❌ | ✅ `deploy.sh rollback` | ❌ |
| Restore از پنل | — | ✅ فقط DB | — | — | — | ✅ DB |
| ارسال تلگرام | ❌ | ✅ اختیاری | — | ❌ | ❌ | ❌ |
| بکاپ `.env` | ❌ دستی | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## ۲. بهرام — بکاپ سرور (cron)

### اسکریپت

`bahram-cm/deploy/scripts/backup.sh`

### زمان‌بندی پیشنهادی

```bash
# /etc/cron.d/bahram-backup
0 3 * * * root /var/www/bahram-cm/deploy/scripts/backup.sh
```

### سیاست پیش‌فرض (cron)

| نوع | تکرار | نگهداری |
|-----|--------|---------|
| **دیتابیس** | هر شب (روزانه) | **۳۰ روز** (~۳۰ فایل) |
| **فایل‌ها (media / storage)** | **هفتگی** (پیش‌فرض: **یک‌شنبه**) | **۳۰ روز** (~۴ فایل) |

متغیرهای env در اسکریپت:

```bash
RETENTION_DAYS=30              # مدت نگهداری (روز)
FILES_BACKUP_WEEKDAY=0         # 0=یک‌شنبه … 6=شنبه
```

### خروجی

| نوع | مسیر | فرمت |
|-----|------|------|
| دیتابیس | `/var/backups/bahram/db/bahram_YYYYMMDD_HHMMSS.sql.gz` | gzip |
| رسانه سایت | `/var/backups/bahram/media/bahram_media_*.tar.gz` | tar.gz — **فقط روزهای هفتگی** |

**نگهداری:** ۳۰ روز (متغیر `RETENTION_DAYS`)

### اجرای دستی

```bash
/var/www/bahram-cm/deploy/scripts/backup.sh
ls -lt /var/backups/bahram/db/ | head -3
ls -lt /var/backups/bahram/media/ | head -3
```

### بازیابی از بکاپ سرور

```bash
# DB — نام دیتابیس از backend/.env
gunzip -c /var/backups/bahram/db/bahram_20260720_030000.sql.gz | mysql bahram_backend

# Media سایت
mkdir -p /var/www/bahram-cm/backend/storage/app/public
tar -xzf /var/backups/bahram/media/bahram_media_20260720_030000.tar.gz \
  -C /var/www/bahram-cm/backend/storage/app/public

cd /var/www/bahram-cm/backend
php artisan storage:link
```

جزئیات مهاجرت کامل سرور: [`bahram-cm/docs/SERVER-MIGRATION.md`](../bahram-cm/docs/SERVER-MIGRATION.md)

---

## ۳. بهرام — بکاپ از پنل ادمین

**مسیر:** `rostami.app/admin/settings` → بخش **بکاپ و بازیابی**

**دسترسی:** فقط Super Admin

### چه چیزی پشتیبانی می‌شود

| عملیات | پشتیبانی |
|--------|----------|
| بکاپ خودکار روزانه (Laravel Scheduler) | ✅ |
| دانلود dump دیتابیس (`.sql.gz`) | ✅ |
| دانلود media سایت (`storage/app/public/media` به صورت ZIP) | ✅ |
| آپلود و restore دیتابیس | ✅ (تایید `RESTORE`) |
| ارسال فایل DB به تلگرام ادمین | ✅ (حداکثر ۵۰ مگ) |
| restore media از پنل | ❌ (دستی extract) |
| بکاپ رسانه Family روی FTP | ❌ |

**نگهداری:** ۳۰ روز برای DB و media (متغیر `RETENTION_DAYS`)

### محل ذخیره محلی (سرور — پنل)

`bahram-cm/backend/storage/app/backups/database/`

**نگهداری پنل (DB):** پیش‌فرض **۳۰ فایل** (≈ یک ماه اگر روزانه) — قابل تنظیم ۱–۳۰ در پنل.

Scheduler: `backup:database` هر دقیقه چک می‌شود؛ فقط در ساعت تنظیم‌شده و اگر «بکاپ خودکار» فعال باشد اجرا می‌شود.

### Artisan

```bash
cd /var/www/bahram-cm/backend
php artisan backup:database --force   # بکاپ فوری
```

### محدودیت مهم

پنل **دیتابیس را export/import** و **media سایت را export** می‌کند. برای restore media، ZIP را در `storage/app/public/` extract کنید. رسانه Family روی FTP از این export پوشش داده **نمی‌شود**.

---

## ۴. Family — آیا بکاپ جدا لازم است؟

### دیتابیس — بله، اما همان dump بهرام کافی است

Family یک **Modular Monolith** داخل `bahram-cm/backend` است — **دیتابیس جدا ندارد**.

همه جداول Family (`families`, `family_posts`, `family_media`, …) داخل همان MySQL بهرام هستند. بنابراین:

- بکاپ DB از cron بهرام ✅
- بکاپ DB از پنل بهرام ✅
- بکاپ جدا برای Family ❌ لازم نیست

جزئیات معماری: [`bahram-cm/docs/FAMILY.md`](../bahram-cm/docs/FAMILY.md)

### فایل‌های رسانه Family — جدا از cron site media

رسانه‌های Family (صوت، ویدیو، تصویر پست‌ها) معمولاً روی دیسک/FTP جدا نگه‌داری می‌شوند:

| محیط | محل فایل |
|------|----------|
| Production | FTP دانلود (`family_media_ftp` در `config/filesystems.php`) |
| Local dev | `storage/app/public/media/family/…` |

**`backup.sh` فقط `storage/app/public/media` (کتابخانه سایت) را tar می‌کند** — فایل‌های روی FTP Family را شامل **نمی‌شود**.

برای ریکاوری کامل Family علاوه بر DB:

1. **FTP Family** — از پنل هاست/FTP بکاپ بگیرید یا mirror دوره‌ای
2. **Local dev** — پوشه `media/family/` داخل همان tarball media سایت (اگر روی public disk باشد)

### خلاصه Family

| لایه | بکاپ از بهرام کافی است؟ |
|------|-------------------------|
| جداول DB (پست، عضو، اکشن، …) | ✅ بله — همان mysqldump |
| کاربران و session | ✅ بله — جدول `users` مشترک |
| رسانه FTP production | ❌ — بکاپ FTP جدا |
| اپ Flutter مدیر | ✅ در git — نیازی به بکاپ runtime نیست |

---

## ۵. سات — بکاپ و rollback

### بکاپ هنگام deploy

`saat/deploy/scripts/deploy.sh` قبل از هر deploy (all/backend/frontend) بکاپ می‌گیرد:

| فایل | مسیر |
|------|------|
| DB | `/var/backups/saat/db_backup_YYYYMMDD_HHMMSS.sql` |
| Storage | `/var/backups/saat/storage_backup_YYYYMMDD_HHMMSS/` |
| Git commit | `/var/backups/saat/git_commit_YYYYMMDD_HHMMSS.txt` |

### Rollback یک‌کلیک (بعد از deploy خراب)

```bash
cd /var/www/saat
./deploy/scripts/deploy.sh rollback
./deploy/scripts/deploy.sh health
```

Rollback آخرین بکاپ deploy را برمی‌گرداند: DB + storage + checkout به commit قبلی + rebuild.

### بکاپ cron

`saat/deploy/scripts/backup.sh` — DB **روزانه**، فایل‌ها **هفتگی**، نگهداری **۳۰ روز**:

```bash
# /etc/cron.d/saat-backup
0 3 * * * root /var/www/saat/deploy/scripts/backup.sh
```

خروجی: `/var/backups/saat/db/` (هر شب) و `/var/backups/saat/storage/` (هفتگی)

---

## ۶. سات — بکاپ از پنل ادمین

**مسیر:** `sat.center/admin/settings` → بخش **بکاپ و بازیابی**

**دسترسی:** نقش Manager / Admin / Super Admin (`admin.settings`)

### قابلیت‌ها (نسبت به بهرام)

| عملیات | سات | بهرام |
|--------|-----|-------|
| دانلود dump دیتابیس | ✅ | ✅ |
| دانلود media / storage | ✅ ZIP (`media/`) | ✅ ZIP (`storage/app`) |
| Restore دیتابیس از پنل | ✅ | ✅ |
| Restore storage از پنل | ❌ (دستی یا rollback deploy) | ❌ |
| ارسال تلگرام | ❌ | ✅ |

### API (برای توسعه‌دهنده)

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/backup` |
| PATCH | `/api/v1/admin/backup` |
| POST | `/api/v1/admin/backup/run` |
| GET | `/api/v1/admin/backup/export/database` |
| GET | `/api/v1/admin/backup/export/storage` |
| POST | `/api/v1/admin/backup/import/database` |

### بازیابی DB سات از بکاپ cron

```bash
mysql -u USER -p saat < /var/backups/saat/db/saat_20260720_030000.sql
# یا اگر gzip:
gunzip -c /var/backups/saat/db/saat_*.sql.gz | mysql saat
```

### بازیابی storage

```bash
# از ZIP پنل یا tarball cron
unzip -o storage_backup.zip -d /tmp/saat-restore
rsync -a /tmp/saat-restore/ /var/www/saat/backend/storage/app/
chown -R www-data:www-data /var/www/saat/backend/storage
```

---

## ۷. بکاپ `.env` و secrets

**هیچ اسکript خودکاری `.env` را بکاپ نمی‌گیرد.** این فایل‌ها حیاتی‌اند:

| فایل | سایت |
|------|------|
| `bahram-cm/backend/.env` | بهرام + Family API |
| `bahram-cm/frontend/.env.local` | Next.js |
| `saat/backend/.env` | سات |

### پیشنهاد

```bash
# از لپ‌تاپ — ماهانه یا بعد از هر تغییر مهم
scp root@SERVER:/var/www/bahram-cm/backend/.env ./secrets/bahram-backend.env
scp root@SERVER:/var/www/bahram-cm/frontend/.env.local ./secrets/bahram-frontend.env.local
scp root@SERVER:/var/www/saat/backend/.env ./secrets/saat-backend.env
```

**⚠️ `APP_KEY` بهرام:** اگر عوض شود، sessionها و داده رمزنگاری‌شده قبلی از بین می‌رود. همیشه `.env` قدیم را در restore نگه دارید.

---

## ۸. بکاپ off-site (خارج از سرور)

بکاپ‌های `/var/backups/` فقط روی دیسک همان سرور هستند. اگر سرور کامل از بین برود، بکاپ هم از بین می‌رود.

### حداقل توصیه

1. هفتگی: `scp` یا `rsync` پوشه `/var/backups/` به لپ‌تاپ یا NAS
2. ماهانه: dump DB + `.env` در encrypted cloud (بدون commit در git)
3. Family FTP: بکاپ از پنل هاست دانلود

### نمونه sync هفتگی (cron روی ماشین شخصی)

```bash
rsync -avz --delete root@SERVER:/var/backups/ ~/foroushino-backups/
```

---

## ۹. ریکاوری سریع — cheat sheet

### بهرام — DB خراب، media سالم

```
پنل admin → بکاپ → Import فایل .sql.gz + RESTORE
```

یا SSH:

```bash
gunzip -c /var/backups/bahram/db/LATEST.sql.gz | mysql DB_NAME
```

### بهرام — media 404

```bash
php artisan storage:link
tar -xzf /var/backups/bahram/media/LATEST.tar.gz -C backend/storage/app/public
```

### Family — پست‌ها هست، فایل صوت/ویدیو 404

- DB سالم است؛ مشکل از FTP/CDN Family
- FTP credentials را در `.env` چک کنید (`FAMILY_MEDIA_*`)
- restore از بکاپ FTP هاست

### سات — deploy خراب

```bash
cd /var/www/saat && ./deploy/scripts/deploy.sh rollback
```

### سات — DB خراب

```
پنل admin/settings → بکاپ → Import
```

یا:

```bash
./deploy/scripts/deploy.sh rollback   # اگر deploy اخیر بود
mysql saat < /var/backups/saat/db_backup_LATEST.sql
```

### کل سرور از بین رفت

1. سرور جدید bootstrap ([`SERVER-MIGRATION.md`](../bahram-cm/docs/SERVER-MIGRATION.md))
2. restore `.env` قدیم
3. restore DB + media از off-site
4. DNS + SSL
5. `deploy.sh` / `storage:link` / supervisor

---

## ۱۰. تست بکاپ

هر ۳–۶ ماه یک بار (یا بعد از راه‌اندازی سرور جدید):

### بهرام

```bash
# 1. بکاپ
/var/www/bahram-cm/deploy/scripts/backup.sh

# 2. روی staging/local — restore
gunzip -c bahram_*.sql.gz | mysql test_bahram
tar -xzf bahram_media_*.tar.gz -C /tmp/test-media

# 3. پنل — export + import روی DB تست
```

### سات

```bash
/var/www/saat/deploy/scripts/backup.sh
# restore روی DB تست
gunzip -c saat_*.sql.gz | mysql test_saat
```

Checklist post-deploy بهرام: آیتم «Backup تست‌شده» در [`DEPLOYMENT.md`](../bahram-cm/docs/DEPLOYMENT.md).

---

## ۱۱. عیب‌یابی

| مشکل | احتمال | راه‌حل |
|------|--------|--------|
| `mysqldump یافت نشد` در پنل | PATH | `MYSQLDUMP_PATH` / `MYSQL_PATH` در `.env` |
| بکاپ تلگرام بهرام fail | حجم > ۵۰MB | از cron سرور یا export دستی |
| لاگین بعد restore کار نمی‌کند | `APP_KEY` عوض شده | `.env` قدیم |
| Family media 404 بعد restore DB | FTP جدا | restore FTP + `FAMILY_MEDIA_CDN_URL` |
| سات rollback «No backup found» | deploy بدون backup prev | restore دستی از cron |
| Permission denied روی storage | owner | `chown -R www-data:www-data storage` |

---

## فایل‌های مرجع

| فایل | نقش |
|------|-----|
| `bahram-cm/deploy/scripts/backup.sh` | cron روزانه بهرام |
| `bahram-cm/backend/app/Services/DatabaseBackupService.php` | بکاپ DB پنل بهرام |
| `saat/deploy/scripts/backup.sh` | cron روزانه سات |
| `saat/deploy/scripts/deploy.sh` | بکاپ + rollback deploy |
| `saat/backend/app/Services/BackupService.php` | بکاپ DB + storage پنل سات |
| `bahram-cm/docs/SERVER-MIGRATION.md` | مهاجرت/ریکاوری کامل سرور |
| `bahram-cm/docs/FAMILY.md` | معماری Family |

---

*آخرین به‌روزرسانی: ۲۰۲۶-۰۷-۲۰*
