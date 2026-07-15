# Mini Call Center

مونورپو شامل دو پروژه:

## ساختار

```
saat/                  ← مینی‌اپ کال‌سنتر (React + Vite) — پورت 5173
bahram-cm/             ← سایت عمومی بهرام رستمی (Next.js) — پورت 3000
bahram-family-manager/ ← اپ Flutter مدیر خانواده — پورت 7357 (وب)
```

## اجرای همزمان (پیشنهادی)

از روت پروژه هر دو سرویس با هم بالا می‌آیند، بدون تداخل پورت:

```bash
npm install          # فقط یک‌بار — concurrently را نصب می‌کند
npm run install:all  # وابستگی‌های saat و bahram-cm
npm run dev
```

| سرویس | آدرس |
|--------|------|
| مینی‌اپ سات | http://localhost:5173 |
| سایت بهرام | http://localhost:3000 |
| مدیر خانواده (Flutter وب) | http://localhost:7357 |
| Laravel (بک‌اند داخلی) | http://127.0.0.1:8010 |

## اجرای جداگانه

```bash
npm run dev:saat      # فقط مینی‌اپ
npm run dev:website   # فقط سایت
npm run dev:family    # اپ Flutter مدیر خانواده (پورت 7357)
```

جزئیات بیشتر:
- [saat/frontend/README.md](saat/frontend/README.md)
- [bahram-cm/README.md](bahram-cm/README.md)
