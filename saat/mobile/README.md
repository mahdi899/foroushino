# سات — اپ اندروید (Flutter)

> **⏸ توسعه فعلاً متوقف است.**  
> کد در `saat/mobile` نگه داشته شده تا بعداً ادامه دهید. نقطه ورود (`lib/main.dart`) در حالت PAUSED است.

---

<!-- فعال‌سازی مجدد: در main.dart بلوک ACTIVE را باز کنید و PAUSED را کامنت کنید. -->

## وضعیت

| مورد | وضعیت |
|------|--------|
| اسکلت Flutter + Android | ✅ آماده |
| ورود OTP، سرنخ‌ها، تماس، Call Log | ✅ کد نوشته شده |
| اجرای اپ کامل | ⏸ غیرفعال (`main.dart` → PAUSED) |
| VoIP | 🔜 بعداً |

### ادامه توسعه (وقتی آماده شدید)

1. `lib/main.dart` — بلوک **ACTIVE** را باز کنید، **PAUSED** را کامنت کنید
2. `flutter create . --platforms=android` (در صورت نیاز)
3. `flutter pub get && flutter run`

---

## چرا Flutter (نه Capacitor)؟

| | Flutter | Capacitor + React |
|---|---------|-------------------|
| Call Log / Phone State | پلاگین‌های native آماده | نیاز به پلاگین سفارشی |
| VoIP بعدی (WebRTC) | `flutter_webrtc` | ممکن ولی سنگین‌تر |
| UI موبایل | Material موبایل‌محور | وب در WebView |
| جداسازی از وب | پوشه مستقل `saat/mobile` | اشتراک کد با React |

وب (`saat/frontend`) برای تلگرام و PWA می‌ماند؛ اپ نصبی فقط اندروید در این پوشه توسعه می‌یابد.

## پیش‌نیاز

1. [Flutter SDK](https://docs.flutter.dev/get-started/install) (۳.۳+)
2. Android Studio + SDK
3. بک‌اند saat در حال اجرا (`saat/backend`)

## راه‌اندازی (بعد از فعال‌سازی مجدد)

```bash
cd saat/mobile
flutter create . --platforms=android
flutter pub get
```

### آدرس API

پیش‌فرض برای **امولاتور اندروید**: `http://10.0.2.2:8000/api/v1`

برای **گوشی واقعی**:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:8000/api/v1
```

## جریان تماس (سیم‌کارت)

```
سرنخ → POST /calls/start → dialer سیستم (tel:)
     → Call Log (مدت + تطبیق شماره)
     → ثبت نتیجه POST /calls/{id}/result
```

### دسترسی‌های اندروید

- `READ_PHONE_STATE`
- `READ_CALL_LOG`
- `CALL_PHONE`

## VoIP (بعداً)

- فلگ: `lib/config/app_config.dart` → `voipEnabled`
- قرارداد: `lib/services/voip_call_service.dart`

## ساختار

```
saat/mobile/
├── lib/main.dart        ← PAUSED / ACTIVE اینجا سوییچ می‌شود
├── lib/features/        auth, home, leads, calls
├── lib/services/        API, call_tracker, voip placeholder
└── android/
```
