# خانواده — Trusted Web Activity (Android APK)

اپ اندروید سبک که `https://rostami.club` را تمام‌صفحه باز می‌کند (TWA). UI همان PWA Next.js است؛ فقط یک شِل اندروید برای توزیع APK.

## پیش‌نیاز

- Node.js 18+
- JDK 17 (`winget install Microsoft.OpenJDK.17` یا اولین اجرای Bubblewrap که JDK را در `%USERPROFILE%\.bubblewrap\jdk` می‌گذارد)
- Android SDK (Bubblewrap در اولین `build` نصب می‌کند)

## راه‌اندازی یک‌بار

```powershell
cd bahram-club-twa
npm install

# کلید امضا + fingerprint برای assetlinks
.\scripts\init-keystore.ps1

# تولید پروژه اندروید از twa-manifest.json
npm run update
```

بعد از `init-keystore`، فایل `bahram-cm/frontend/data/twa-asset-links.json` به‌روز می‌شود. **حتماً** فرانت را deploy کنید تا این آدرس live شود:

`https://rostami.club/.well-known/assetlinks.json`

## ساخت APK

```powershell
cd bahram-club-twa

# رمز keystore پیش‌فرض init-keystore: android
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = 'android'
$env:BUBBLEWRAP_KEY_PASSWORD = 'android'

npm run build
```

خروجی:

| فایل | کاربرد |
|------|--------|
| `app-release-signed.apk` | نصب مستقیم / کافه‌بازار |
| `app-release-bundle.aab` | آپلود Google Play |

## تنظیمات

| فایل | نقش |
|------|-----|
| `twa-manifest.json` | packageId، host، رنگ‌ها، آیکون |
| `android.keystore` | کلید امضا (در git نیست) |
| `bahram-cm/frontend/data/twa-asset-links.json` | fingerprint برای Digital Asset Links |

متغیرهای اختیاری سرور (جایگزین فایل JSON):

```env
TWA_ANDROID_PACKAGE_ID=club.rostami.family
TWA_ANDROID_SHA256_FINGERPRINTS=AA:BB:CC:...
```

## نسخه جدید

1. `appVersionCode` و `appVersionName` را در `twa-manifest.json` بالا ببرید
2. `npm run update && npm run build`

تغییر UI سایت نیاز به APK جدید **ندارد** — فقط برای تغییر package، آیکون، یا کلید امضا.

## عیب‌یابی

- **نوار آدرس Chrome دیده می‌شود:** `assetlinks.json` روی `rostami.club` درست serve نشده یا fingerprint با keystore APK یکی نیست.
- **اعتبارسنجی:** `npm run validate`
- **لیست fingerprint:** `npm run fingerprint:list`

## امنیت

- `android.keystore` را commit نکنید.
- قبل از انتشار رسمی، رمز keystore را از `android` عوض کنید.
- برای Play Store از upload key جدا استفاده کنید.
