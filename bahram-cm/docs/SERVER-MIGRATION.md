# مهاجرت سرور — تغییر IP (Migration)

راهنمای انتقال سایت از **یک VPS به VPS دیگر** (IP جدید).  
این کار با **ریستارت ساده** فرق دارد — باید داده و تنظیمات را دستی منتقل کنید.

**مرجع deploy اولیه:** [`DEPLOYMENT.md`](DEPLOYMENT.md)  
**سرور سات (جدا):** [`../../saat/deploy/DEPLOYMENT.md`](../../saat/deploy/DEPLOYMENT.md)

---

## خلاصه خیلی ساده (۵ مرحله)

```
۱. از سرور قدیم → بک‌آپ بگیر (.env + دیتابیس + media)
۲. روی سرور جدید → نرم‌افزار نصب + کد clone
۳. بک‌آپ‌ها را restore کن (همان APP_KEY!)
۴. nginx + SSL + PM2 + supervisor را بالا بیاور
۵. DNS را به IP جدید بزن → تست → سرور قدیم را خاموش کن
```

**زمان تقریبی:** ۳۰–۹۰ دقیقه (بسته به حجم دیتابیس و media)  
**قطعی سایت:** معمولاً ۵–۳۰ دقیقه (بعد از عوض کردن DNS)

---

## چه چیزهایی جابه‌جا می‌شوند؟

| مورد | کجاست | مهاجرت؟ |
|------|--------|---------|
| دیتابیس (سفارش، مقالات، کاربران، خانواده) | MySQL روی سرور | ✅ بله |
| فایل‌های media محلی | `backend/storage/app/public/media/` | ✅ بله |
| تنظیمات و secrets | `backend/.env` + `frontend/.env.local` | ✅ بله — **کپی عیناً** |
| SSL | Let's Encrypt روی سرور | 🔄 روی IP جدید دوباره صادر می‌شود |
| DNS | Cloudflare | 🔄 A record → IP جدید |
| رسانه CDN سایت | `cdn.rostami.app` | ❌ جداست — نیازی به جابه‌جایی نیست |
| رسانه خانواده | FTP + `family-cdn.rostami.club` | ❌ جداست |
| Webhook تلگرام | به `rostami.app` | 🔄 بعد از DNS دوباره set |

---

## ⚠️ اشتباهات رایج

| ❌ نکن | ✅ درست |
|--------|---------|
| `bootstrap-server.sh` کامل برای migration | فقط restore `.env` + DB از سرور قدیم |
| `php artisan key:generate` روی production منتقل‌شده | همان `APP_KEY` قدیم را نگه دار |
| `DatabaseSeeder` کامل در production | فقط restore dump |
| `telegram:webhook:set` روی سرور **saat** | webhook فقط از **bahram-cm** |
| فراموش کردن supervisor / PM2 startup | بعد از reboot سایت بالا نمی‌آید |

---

# بخش A — سرور اصلی (rostami.app + rostami.club)

## A.1 — چک‌لیست قبل از شروع

- [ ] IP جدید سرور را دارید
- [ ] SSH به هر دو سرور (قدیم + جدید) باز است
- [ ] پورت‌های **80** و **443** روی سرور جدید باز است
- [ ] دسترسی **Cloudflare** برای عوض کردن DNS
- [ ] Ubuntu **22.04** یا **24.04** روی سرور جدید

---

## A.2 — مرحله ۱: بک‌آپ از سرور قدیم

روی **سرور فعلی** (مثلاً `193.228.90.175`) به‌عنوان root:

```bash
# بک‌آپ خودکار DB + media
/var/www/bahram-cm/deploy/scripts/backup.sh

# آخرین فایل‌های بک‌آپ
ls -lt /var/backups/bahram/db/ | head -3
ls -lt /var/backups/bahram/media/ | head -3
```

فایل‌های `.env` را جدا کپی کنید (روی لپ‌تاپ یا مستقیم به سرور جدید):

```bash
# از لپ‌تاپ — OLD_IP و NEW_IP را عوض کنید
scp root@OLD_IP:/var/www/bahram-cm/backend/.env ./bahram-backend.env
scp root@OLD_IP:/var/www/bahram-cm/frontend/.env.local ./bahram-frontend.env.local
scp root@OLD_IP:/var/backups/bahram/db/bahram_*.sql.gz ./
scp root@OLD_IP:/var/backups/bahram/media/bahram_media_*.tar.gz ./
```

یا مستقیم سرور به سرور:

```bash
scp root@OLD_IP:/var/www/bahram-cm/backend/.env root@NEW_IP:/root/bahram-backend.env
scp root@OLD_IP:/var/www/bahram-cm/frontend/.env.local root@NEW_IP:/root/bahram-frontend.env.local
scp root@OLD_IP:/var/backups/bahram/db/bahram_*.sql.gz root@NEW_IP:/root/
scp root@OLD_IP:/var/backups/bahram/media/bahram_media_*.tar.gz root@NEW_IP:/root/
```

---

## A.3 — مرحله ۲: آماده‌سازی سرور جدید

روی **سرور جدید** (`NEW_IP`) به‌عنوان root:

### نصب پکیج‌ها

```bash
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  nginx git curl unzip ca-certificates \
  mysql-server redis-server supervisor certbot \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-redis php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-gd php8.3-intl php8.3-zip php8.3-bcmath php8.3-ftp

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
npm install -g pm2

if ! command -v composer >/dev/null 2>&1; then
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

systemctl enable --now nginx mysql redis-server php8.3-fpm supervisor
```

### Clone کد

```bash
mkdir -p /var/www
git clone --branch main https://github.com/mahdi899/foroushino.git /var/www/foroushino
ln -sfn /var/www/foroushino/bahram-cm /var/www/bahram-cm
```

---

## A.4 — مرحله ۳: restore داده و تنظیمات

### ۳.۱ — `.env` از سرور قدیم

```bash
cp /root/bahram-backend.env /var/www/bahram-cm/backend/.env
cp /root/bahram-frontend.env.local /var/www/bahram-cm/frontend/.env.local
chmod 600 /var/www/bahram-cm/backend/.env
```

> **حیاتی:** خط `APP_KEY=` باید **دقیقاً** همان سرور قدیم باشد.

### ۳.۲ — MySQL

مقادیر را از `.env` بخوانید:

```bash
grep -E '^DB_(DATABASE|USERNAME|PASSWORD)=' /var/www/bahram-cm/backend/.env
```

سپس user و دیتابیس را بسازید (مقادیر را جایگزین کنید):

```bash
DB_NAME="bahram_backend"      # از .env
DB_USER="bahram"              # از .env
DB_PASS="..."                 # از .env

mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

gunzip -c /root/bahram_*.sql.gz | mysql "${DB_NAME}"
```

### ۳.۳ — Media

```bash
mkdir -p /var/www/bahram-cm/backend/storage/app/public
tar -xzf /root/bahram_media_*.tar.gz \
  -C /var/www/bahram-cm/backend/storage/app/public
chown -R www-data:www-data /var/www/foroushino
```

### ۳.۴ — Build اپ

```bash
cd /var/www/bahram-cm/backend
composer install --no-dev --optimize-autoloader --no-interaction
php artisan storage:link
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

cd /var/www/bahram-cm/frontend
npm ci
npm run build
```

---

## A.5 — مرحله ۴: nginx + SSL + PM2 + Supervisor

### روش ساده (پیشنهادی): `setup-origin-ssl.sh`

**قبل از اجرا:** در Cloudflare موقتاً DNS را به IP جدید بزنید (یا حداقل برای تست SSL).

```bash
export ORIGIN_IP="NEW_IP"           # IP سرور جدید
export CERTBOT_EMAIL="shokspy@gmail.com"
bash /var/www/bahram-cm/deploy/scripts/setup-origin-ssl.sh
```

این اسکریپت nginx، SSL (webroot)، Flutter admin build، PM2 و cron تمدید cert را نصب می‌کند.

### Supervisor (صف Laravel + تلگرام)

```bash
cp /var/www/bahram-cm/deploy/supervisor/bahram-queue.conf /etc/supervisor/conf.d/
cp /var/www/bahram-cm/deploy/supervisor/bahram-family-queue.conf /etc/supervisor/conf.d/
cp /var/www/bahram-cm/backend/deploy/supervisor-telegram-horizon.conf.example \
   /etc/supervisor/conf.d/bahram-telegram-horizon.conf

supervisorctl reread
supervisorctl update
supervisorctl start bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler
```

### Cron بک‌آپ روزانه

```bash
echo '0 3 * * * /var/www/bahram-cm/deploy/scripts/backup.sh' > /etc/cron.d/bahram-backup
```

### PM2 بعد از reboot

```bash
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | tail -1 | bash
```

---

## A.6 — مرحله ۵: تست قبل از DNS

روی **لپ‌تاپ**، فایل hosts را موقت ویرایش کنید:

**Windows:** `C:\Windows\System32\drivers\etc\hosts`  
**Linux/Mac:** `/etc/hosts`

```
NEW_IP  rostami.app www.rostami.app rostami.club www.rostami.club
```

سپس در مرورگر یا ترمینال:

```bash
curl -sI https://rostami.app | head -1
curl -sI https://rostami.club | head -1
```

روی **خود سرور**:

```bash
curl -sf http://127.0.0.1:8010/up && echo "Laravel OK"
curl -sf http://127.0.0.1:3000/ && echo "Next.js OK"
pm2 list
supervisorctl status
```

همه باید `200` / `online` / `RUNNING` باشند.

---

## A.7 — cutover DNS (Cloudflare)

در **Cloudflare → DNS** برای zoneهای `rostami.app` و `rostami.club`:

| رکورد | نوع | مقدار | Proxy |
|--------|-----|--------|-------|
| `@` | A | `NEW_IP` | ☁️ Proxied |
| `www` | A یا CNAME | `NEW_IP` | ☁️ Proxied |
| `cdn` | A | `NEW_IP` | ☁️ Proxied |
| `@` (rostami.club) | A | `NEW_IP` | ☁️ Proxied |
| `www` | A | `NEW_IP` | ☁️ Proxied |
| `family-cdn` | A | `NEW_IP` | ☁️ Proxied |

تنظیمات SSL/TLS → **Full (strict)**

بعد از propagate (۵–۳۰ دقیقه):

```bash
cd /var/www/bahram-cm/backend
php artisan telegram:webhook:set production
php artisan telegram:webhook:info production
```

در Cloudflare یک‌بار **Purge Everything** (اختیاری ولی توصیه می‌شود).

---

## A.8 — خاموش کردن سرور قدیم

فقط وقتی مطمئن شدید همه چیز روی IP جدید کار می‌کند:

```bash
# روی سرور قدیم
pm2 delete all
supervisorctl stop all
systemctl stop nginx
```

یا سرور قدیم را destroy کنید.

---

## A.9 — چک‌لیست نهایی

- [ ] `https://rostami.app` → 200
- [ ] `https://rostami.club` → 200
- [ ] `https://rostami.club/admin/` → پنل Flutter
- [ ] لاگین ادمین / دانشجو کار می‌کند
- [ ] عکس‌های CDN (`cdn.rostami.app`) لود می‌شوند
- [ ] فرم تماس / سفارش ثبت می‌شود
- [ ] `supervisorctl status` → همه RUNNING
- [ ] `php artisan telegram:webhook:info production` → URL درست
- [ ] بک‌آپ cron فعال است
- [ ] سرور قدیم خاموش است

---

# بخش B — سرور سات (sat.center) — جدا از بهرام

اگر **فقط** `sat.center` را به IP جدید می‌برید:

```
سرور بهرام (rostami.app)  ←→  API/sync
سرور سات (sat.center)     ←→  جدا — DNS مستقیم (بدون CDN)
```

### مراحل ساده

1. بک‌آپ از سرور saat قدیم:
   ```bash
   mysqldump ... | gzip > saat_backup.sql.gz
   scp /var/www/saat/backend/.env ...
   ```

2. روی سرور جدید:
   ```bash
   git clone ... /var/www/mini-call-center
   ln -sfn .../saat /var/www/saat
   # restore .env + DB
   cd /var/www/saat && ./deploy/scripts/deploy.sh all
   certbot --nginx -d sat.center -d www.sat.center
   ```

3. DNS `sat.center` → IP جدید

4. **هرگز** `php artisan telegram:webhook:set` روی saat اجرا نکنید.

جزئیات: [`saat/deploy/DEPLOYMENT.md`](../../saat/deploy/DEPLOYMENT.md)

---

# بخش C — عیب‌یابی

| مشکل | احتمال | راه‌حل |
|------|--------|--------|
| 502 Bad Gateway | PM2 یا PHP-FPM down | `pm2 list` / `systemctl status php8.3-fpm` |
| لاگین کار نمی‌کند | `APP_KEY` عوض شده | `.env` قدیم را restore کن |
| عکس‌ها 404 | storage link نیست | `php artisan storage:link` |
| ربات تلگرام جواب نمی‌دهد | webhook | `php artisan telegram:webhook:set production` |
| صف گیر کرده | supervisor | `supervisorctl restart bahram-queue:*` |
| SSL error | cert روی IP قدیم | `certbot certonly --webroot ...` دوباره |
| سایت قدیم هنوز باز است | DNS cache | صبر + Purge Cloudflare |

---

# بخش D — مقایسه: ریستارت vs مهاجرت

| | ریستارت همان سرور | مهاجرت به IP جدید |
|--|-------------------|-------------------|
| داده | روی دیسک می‌ماند | باید بک‌آپ/restore |
| DNS | بدون تغییر | باید عوض شود |
| SSL | همان cert | cert جدید |
| زمان | ۱–۳ دقیقه | ۳۰–۹۰ دقیقه |
| خودکار | بله (systemd/PM2) | خیر — دستی |

---

*آخرین به‌روزرسانی: مهاجرت IP — rostami.app + rostami.club + sat.center*
