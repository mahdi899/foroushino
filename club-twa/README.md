# TWA کلاب / خانواده — `rostami.club`

اپ اندروید **Trusted Web Activity** برای PWA خانواده. داخل کروم بدون نوار آدرس باز می‌شود (بعد از تأیید Digital Asset Links).

| مورد | مقدار |
|------|--------|
| Origin | `https://rostami.club` |
| start_url | `/` |
| Manifest | `https://rostami.club/family-manifest.webmanifest` |
| applicationId | `club.rostami.family` |
| نام اپ | خانواده |

**از `rostami.app/family` استفاده نکن** — به کلاب ریدایرکت می‌شود و هویت PWA اشتباه است.

این پروژه **جدا** از Flutter Family Manager (`bahram-family-manager`) است؛ آن برای ادمین است، این برای عضو کلاب.

---

## ۱) باز کردن در Android Studio

1. Android Studio → **File → Open**
2. پوشه `club-twa` را انتخاب کن (همین فولدر، نه روت ریپو)
3. صبر کن تا Gradle Sync تمام شود
4. اگر دانلود از `dl.google.com` گیر کرد، در `settings.gradle.kts` آینه Aliyun از قبل هست؛ در صورت نیاز VPN بزن و Sync را Retry کن

---

## ۲) تست سریع (debug)

1. گوشی/امولاتور با Chrome به‌روز
2. Run ▶ (variant **debug** → package می‌شود `club.rostami.family.debug`)
3. تا وقتی `assetlinks.json` روی سرور با SHA256 درست نباشد، ممکن است **نوار آدرس** دیده شود — طبیعی است

برای تست بدون نوار آدرس روی debug (قبل از deploy کردن assetlinks):

```powershell
# Chrome را debug بگذار و verification را برای دامنه کلاب خاموش کن
adb shell am set-debug-app --persistent com.android.chrome
adb shell "echo '_ --disable-digital-asset-link-verification-for-url=\"https://rostami.club\"' > /data/local/tmp/chrome-command-line"
adb shell am force-stop com.android.chrome
```

بعد اپ را دوباره باز کن. برای برگشت:

```powershell
adb shell am clear-debug-app
adb shell rm /data/local/tmp/chrome-command-line
```

یا SHA256 کلید debug را در `assetlinks.json` بگذار و بعد از deploy روی `rostami.club` تست کن (مرحله ۳).

---

## ۳) Digital Asset Links (الزامی برای TWA واقعی)

فایل در فرانت:

`bahram-cm/frontend/public/.well-known/assetlinks.json`

بعد از deploy باید این آدرس ۲۰۰ بدهد:

`https://rostami.club/.well-known/assetlinks.json`

### گرفتن SHA256

**Debug (Android Studio default):**

```powershell
cd club-twa
.\scripts\print-sha256.ps1 -Debug
```

یا:

```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

خط `SHA256:` را کپی کن (بدون فاصله‌های اضافی در JSON).

**Release (برای Play / APK نهایی):**

```powershell
keytool -genkeypair -v -keystore club-release.keystore -alias club -keyalg RSA -keysize 2048 -validity 10000
keytool -list -v -keystore club-release.keystore -alias club
```

`REPLACE_WITH_RELEASE_SHA256` را با fingerprint کلید release عوض کن. برای debug همین ماشین، fingerprint در فایل گذاشته شده است.

سپس فرانت را deploy کن تا آدرس بالا از production سرو شود (الان لوکال است تا deploy نشود).

تأیید گوگل:

https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://rostami.club&relation=delegate_permission/common.handle_all_urls

---

## ۴) ساخت APK / AAB

در Android Studio:

- **Build → Build Bundle(s) / APK(s) → Build APK(s)** برای نصب مستقیم
- **Generate Signed Bundle / APK** برای Play Store (AAB)

یا از ترمینال (بعد از sync کامل Studio):

```powershell
cd club-twa
.\gradlew.bat assembleDebug
# خروجی: app\build\outputs\apk\debug\app-debug.apk
```

---

## ۵) Signing برای release

در `app/build.gradle.kts` یک `signingConfigs` اضافه کن و به `release` وصل کن (رمز را در ریپو نگذار — از `keystore.properties` لوکال استفاده کن).

---

## نکات

- `/admin` روی `rostami.club` پنل Flutter مدیر است؛ کاربر معمولی کلاب به آن نیاز ندارد.
- Push وب از طریق Chrome/TWA ممکن است جدا از FCM نیتیو باشد؛ فعلاً همان PWA.
- Package ID را بعد از انتشار Play عوض نکن.
