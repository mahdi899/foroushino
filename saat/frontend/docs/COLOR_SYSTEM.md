# راهنمای استفاده از سیستم رنگی Saat در اپ

هدف از این پالت اینه که اپ حس **فروش حرفه‌ای، تیم بزرگ کال‌سنتر، اعتماد، سرعت، درآمد و تکنولوژی گرم** بده.
رنگ اصلی برند **سبز کله‌غازی / Teal** است و رنگ‌های طلایی و نارنجی فقط برای تأکید روی فروش، درآمد، فرصت و اکشن‌های مهم استفاده می‌شوند.

---

## 1. قانون کلی رنگ‌ها

### رنگ اصلی برند

`Primary / Teal`

برای چیزهایی که هویت اصلی اپ هستند:

* دکمه اصلی صفحات
* شروع تماس
* ثبت فیدبک
* ادامه دادن
* ذخیره اطلاعات
* Navigation active
* آیکون‌های اصلی
* Headerهای مهم
* Progress اصلی

رنگ‌های اصلی:

```css
primary: #006F75
primary-dark: #003B40
primary-light: #008C96
```

---

### رنگ فروش و درآمد

`Secondary / Gold` و `Accent / Orange`

این رنگ‌ها نباید همه‌جا پخش شوند. فقط جاهایی استفاده شوند که واقعاً حس **فروش، پول، کمیسیون، لید داغ یا موفقیت تجاری** دارند.

کاربردها:

* ثبت فروش موفق
* کیف پول
* کمیسیون
* درآمد امروز
* فرصت داغ
* Badgeهای مهم
* CTAهای خاص
* Highlight در داشبورد

رنگ‌ها:

```css
gold: #FFB000
orange: #FF6B00
glow: #FFE08A
```

قانون مهم:

**Teal برای عملکرد اپ است. Gold/Orange برای فروش و درآمد است.**

---

## 2. Background و Surface

### Light Mode

پس‌زمینه اپ باید خیلی تمیز، روشن و کمی مایل به سبز/آبی باشد، نه خاکستری سرد.

```css
background: #F8FBFB
surface: #FFFFFF
surface-soft: #F2F7F7
surface-tint: #E6F5F4
border: #DDEAEA
```

استفاده:

* صفحه اصلی: `background`
* کارت‌ها: `surface`
* سکشن‌های جداکننده: `surface-soft`
* باکس‌های برنددار خیلی لطیف: `surface-tint`
* Border کارت‌ها و inputها: `border`

نباید کل صفحه سفید خالص باشد. بهتره بک‌گراند کلی `#F8FBFB` باشد و کارت‌ها سفید.

---

### Dark Mode

دارک مود باید عمیق، مدرن و تمیز باشد. بک‌گراند کاملاً مشکی خام نباشد؛ کمی سبز/آبی خیلی تیره داشته باشد.

```css
background: #050A0B
background-deep: #020607
surface: #0D1517
surface-elevated: #142326
surface-tint: #102E33
border: #1D3438
border-strong: #2B555B
```

استفاده:

* صفحه اصلی دارک: `#050A0B`
* Splash/Login دارک: `#020607`
* کارت‌ها: `#0D1517`
* BottomSheet / Modal / Card برجسته: `#142326`
* Border معمولی: `#1D3438`
* Border حالت active: `#2B555B`

---

## 3. دکمه‌ها

### Primary Button

برای اکشن‌های اصلی و پرتکرار:

* ورود
* ادامه
* شروع تماس
* ثبت فیدبک
* ذخیره
* تایید

#### Light

```css
background: #006F75
hover: #005B61
pressed: #00484D
text: #FFFFFF
```

یا گرادینت:

```css
background: linear-gradient(135deg, #006F75 0%, #008C96 100%);
box-shadow: 0 8px 20px rgba(0, 111, 117, 0.22);
```

#### Dark

```css
background: #008C96
hover: #00A0A8
pressed: #006F75
text: #EAFBFB
```

یا گرادینت:

```css
background: linear-gradient(135deg, #006F75 0%, #008C96 100%);
box-shadow: 0 0 18px rgba(0, 140, 150, 0.30);
```

**Tailwind:** `variant="primary"` در `Button.tsx`

---

### Sales / Money CTA Button

فقط برای اکشن‌هایی که مستقیم به فروش، درآمد یا کمیسیون مربوط هستند:

* ثبت فروش موفق
* مشاهده کمیسیون
* برداشت / کیف پول
* Upgrade
* فرصت داغ
* تبدیل لید به فروش

#### Light و Dark

```css
background: linear-gradient(135deg, #FFB000 0%, #FF6B00 100%);
text: #1A1200;
box-shadow: 0 8px 22px rgba(255, 176, 0, 0.28);
```

نکته مهم:
روی دکمه طلایی `#FFB000` متن سفید نگذارید. متن تیره مثل `#1A1200` بهتر و خواناتر است.

**Tailwind:** `variant="sales"` در `Button.tsx`

---

### Secondary Button

برای اکشن‌های معمولی و کم‌ریسک:

* مشاهده جزئیات
* فیلتر
* تغییر وضعیت
* باز کردن BottomSheet
* انتخاب گزینه

#### Light

```css
background: #F2F7F7
text: #006F75
border: #DDEAEA
hover: #E6F5F4
```

#### Dark

```css
background: #142326
text: #EAFBFB
border: #1D3438
hover: #1A2F33
```

**Tailwind:** `variant="secondary"` در `Button.tsx`

---

### Ghost Button

برای اکشن‌های کم‌اهمیت:

* رد کردن
* برگشت
* بعداً
* مشاهده بیشتر

#### Light

```css
background: transparent
text: #006F75
hover-bg: #E6F5F4
```

#### Dark

```css
background: transparent
text: #95B4B8
hover-bg: rgba(0, 140, 150, 0.12)
hover-text: #EAFBFB
```

**Tailwind:** `variant="ghost"` در `Button.tsx`

---

### Danger Button

برای حذف، لغو جدی، خطا و عملیات غیرقابل برگشت:

```css
light-bg: #E5484D
dark-bg: #FF5C66
text: #FFFFFF
```

از نارنجی برای خطا استفاده نشود؛ نارنجی برای فروش و CTA است، نه خطر.

**Tailwind:** `variant="danger"` در `Button.tsx`

---

## 4. متن‌ها

### Light Mode

```css
text-primary: #0B1F22
text-muted: #52676A
text-soft: #8BA8AC
```

استفاده:

* عنوان‌ها و عددهای مهم: `text-neutral-900` یا `text-text`
* توضیحات و subtitle: `text-neutral-600` یا `text-text-muted`
* placeholder، timestamp، متن‌های کم‌اهمیت: `text-neutral-400` یا `text-text-soft`

### Dark Mode

```css
text-primary: #EAFBFB
text-muted: #95B4B8
text-soft: #5F7F83
```

در دارک مود متن‌های خاکستری نباید خیلی تیره شوند، چون روی بک‌گراند گم می‌شوند.

---

## 5. Lead Temperature

### Hot Lead

لید داغ باید حس فوری، انرژی فروش و فرصت بدهد.

```css
hot: #FF6B00
hot-soft: #FFF1E6
hot-dark-bg: rgba(255, 107, 0, 0.14)
```

کاربرد:

* Badge لید داغ
* Priority بالا
* فرصت نزدیک به فروش
* هشدار پیگیری فوری

**Tailwind:** `hot-*` — مثلاً `bg-hot-50 text-hot-600`

---

### Warm Lead

لید گرم برای فرصت‌های خوب ولی نه خیلی فوری.

```css
warm: #FFB000
warm-soft: #FFF8E6
warm-dark-bg: rgba(255, 176, 0, 0.14)
```

**Tailwind:** `warm-*`

---

### Cold Lead

لید سرد **نباید** از Teal برند استفاده کند. از **Steel Blue-Gray** استفاده می‌شود — سرد و خنثی، بدون سبز/Teal برند.

```css
cold: #526B80
cold-soft: #F0F4F8
cold-dark-bg: rgba(82, 107, 128, 0.14)
```

**Tailwind:** `cold-*`

---

## 6. کارت‌ها

### Light Card

```css
background: #FFFFFF
border: 1px solid #DDEAEA
text: #0B1F22
shadow: 0 10px 28px rgba(11, 31, 34, 0.08)
```

**Tailwind:** `bg-surface border border-border/60 shadow-card`

کارت‌های خیلی مهم مثل لید داغ یا فروش موفق می‌توانند یک خط accent داشته باشند:

```css
border-left: 3px solid #FF6B00;
```

یا برای کارت برند:

```css
border-left: 3px solid #006F75;
```

### Dark Card

```css
background: #0D1517
border: 1px solid #1D3438
text: #EAFBFB
shadow: 0 12px 32px rgba(2, 6, 7, 0.42)
```

کارت active در دارک مود:

```css
background: #142326
border: 1px solid #2B555B
```

**Tailwind:** `dark:bg-surface dark:border-border`

---

## 7. Header / Navigation / Bottom Nav

### Light

* بک‌گراند Header: `#FFFFFF` یا `#F8FBFB`
* Border پایین: `#DDEAEA`
* آیتم active: `#006F75`
* آیتم inactive: `#8BA8AC`

### Dark

* بک‌گراند Header: `#0D1517`
* Border پایین: `#1D3438`
* آیتم active: `#008C96`
* آیتم inactive: `#5F7F83`

برای Active Tab می‌توان از بک‌گراند خیلی نرم استفاده کرد:

```css
light: #E6F5F4
dark: rgba(0, 140, 150, 0.14)
```

---

## 8. Onboarding / Login / Splash

اینجا باید برند بیشترین حضور را داشته باشد.

### Light

* بک‌گراند: `#F8FBFB`
* لوگو: گرادینت Teal
* CTA اصلی: Teal
* CTA فروش یا پیام انگیزشی: Gold/Orange محدود

گرادینت لوگو لایت:

```css
linear-gradient(135deg, #003B40 0%, #006F75 55%, #FFB000 100%)
```

### Dark

* بک‌گراند: `#020607`
* لوگو: نسخه روشن‌تر با edge light
* Glow کنترل‌شده طلایی/Teal

گرادینت لوگو دارک:

```css
linear-gradient(135deg, #00484D 0%, #008C96 50%, #FFB000 100%)
```

Glow:

```css
filter: drop-shadow(0 0 22px rgba(255, 176, 0, 0.24));
```

نارنجی در Splash زیاد نشود؛ فقط هایلایت و خطوط جزئی.

---

## 9. Dialer / صفحه تماس

صفحه تماس یکی از مهم‌ترین صفحات اپ است.

رنگ‌ها:

* دکمه شروع تماس: Primary Teal
* تماس موفق: Success
* عدم پاسخ: Warning / Warm
* شماره اشتباه یا خطا: Error
* ثبت فروش بعد تماس: Sales CTA Orange/Gold

```css
call-primary: #006F75
call-success: #10A37F
call-warning: #FFB000
call-error: #E5484D
call-sale: #FF6B00
```

در دارک مود:

```css
call-primary: #008C96
call-success: #18C99A
call-warning: #FFB000
call-error: #FF5C66
call-sale: #FF6B00
```

---

## 10. Wallet / Commission / Sales Report

این بخش باید حس درآمد و انگیزه بدهد. اینجا Gold و Orange مجازتر هستند.

استفاده:

* عدد کمیسیون: `#FFB000`
* دکمه برداشت یا مشاهده جزئیات: `#FF6B00`
* کارت درآمد: گرادینت Teal + Gold
* نمودار درآمد: Gold / Orange
* وضعیت تسویه موفق: Success

گرادینت پیشنهادی کارت درآمد:

```css
background: linear-gradient(135deg, #003B40 0%, #006F75 55%, #FFB000 100%);
color: #FFFFFF;
```

در دارک مود:

```css
background: linear-gradient(135deg, #0D1517 0%, #00484D 55%, rgba(255, 176, 0, 0.22) 100%);
border: 1px solid rgba(255, 176, 0, 0.22);
```

---

## 11. Forms / Inputs

### Light

```css
input-bg: #FFFFFF
input-border: #DDEAEA
input-text: #0B1F22
placeholder: #8BA8AC
focus-border: #006F75
focus-shadow: rgba(0, 111, 117, 0.18)
```

### Dark

```css
input-bg: #0D1517
input-border: #1D3438
input-text: #EAFBFB
placeholder: #5F7F83
focus-border: #008C96
focus-shadow: rgba(0, 140, 150, 0.22)
```

خطای input:

```css
border: #E5484D
message: #E5484D
```

در دارک:

```css
border: #FF5C66
message: #FF5C66
```

---

## 12. Badge / Chip / Status

### Badge برند

```css
light-bg: #E6F5F4
light-text: #006F75

dark-bg: rgba(0, 140, 150, 0.14)
dark-text: #5FBDBE
```

**Tailwind:** `tone="primary"` در `Badge.tsx`

### Badge فروش

```css
light-bg: #FFF1E6
light-text: #FF6B00

dark-bg: rgba(255, 107, 0, 0.16)
dark-text: #FFA24D
```

**Tailwind:** `tone="accent"` یا `tone="hot"`

### Badge کمیسیون / درآمد

```css
light-bg: #FFF8E6
light-text: #DB9200

dark-bg: rgba(255, 176, 0, 0.16)
dark-text: #FFD04D
```

**Tailwind:** `tone="secondary"` یا `tone="warm"`

### Badge موفقیت

```css
light-bg: #E9FBF5
light-text: #10A37F

dark-bg: rgba(16, 163, 127, 0.16)
dark-text: #5AD9B0
```

**Tailwind:** `tone="success"`

---

## 13. Progress / StageBar

برای Progress عمومی:

```css
from: #006F75
to: #008C96
track-light: #DDEAEA
track-dark: #1D3438
```

برای Progress فروش یا کمیسیون:

```css
from: #FFB000
to: #FF6B00
track-light: #FFEEC2
track-dark: rgba(255, 176, 0, 0.16)
```

ProgressRing اصلی اپ بهتره Teal باشد.
ProgressRing مربوط به درآمد یا فروش بهتره Gold/Orange باشد.

**کد:** `src/components/ui/ProgressRing.tsx` — پیش‌فرض Teal→Gold

---

## 14. Skeleton / Loading

### Light

```css
skeleton-base: #F2F7F7
skeleton-highlight: #FFFFFF
```

### Dark

```css
skeleton-base: #142326
skeleton-highlight: #1D3438
```

Loading اصلی یا spinner:

```css
light: #006F75
dark: #008C96
```

برای loading فروش یا کیف پول:

```css
#FFB000
```

---

## 15. Toast / Alert

### Success Toast

```css
bg-light: #E9FBF5
text-light: #087058
border-light: #93EACD

bg-dark: rgba(16, 163, 127, 0.14)
text-dark: #5AD9B0
border-dark: rgba(16, 163, 127, 0.28)
```

### Warning Toast

```css
bg-light: #FFF8E6
text-light: #A96F00
border-light: #FFE08A

bg-dark: rgba(255, 176, 0, 0.14)
text-dark: #FFD04D
border-dark: rgba(255, 176, 0, 0.28)
```

### Error Toast

```css
bg-light: #FFF0F1
text-light: #C9363B
border-light: #FFC2C8

bg-dark: rgba(255, 92, 102, 0.14)
text-dark: #FF8F9A
border-dark: rgba(255, 92, 102, 0.28)
```

---

## 16. Avatar Gradients

برای آواتارها از رنگ‌های خارج از برند زیاد استفاده نشود.

```css
1: #003B40 → #008C96
2: #006F75 → #10A37F
3: #FFB000 → #FF6B00
4: #415566 → #8FA8BC
5: #E5484D → #FF6B00
6: #00484D → #FFB000
```

**کد:** `src/components/ui/Avatar.tsx`

---

## 17. Charts / Dashboard

برای نمودارها:

* فروش موفق: `#10A37F`
* درآمد / کمیسیون: `#FFB000`
* لید داغ: `#FF6B00`
* لید سرد: `#526B80`
* خطا / از دست رفته: `#E5484D`
* Neutral data: `#8BA8AC`

در دارک مود opacityها را بالاتر بگیر که رنگ‌ها گم نشوند.

---

## 18. استفاده از Orange و Gold محدود باشد

نکته خیلی مهم:

`#FF6B00` و `#FFB000` رنگ‌های پرانرژی هستند. اگر زیاد استفاده شوند، UI شلوغ و تبلیغاتی می‌شود.

قانون پیشنهادی:

* 70٪ رنگ‌های UI: Neutral / Surface
* 20٪ رنگ برند: Teal
* 10٪ رنگ تأکیدی: Gold / Orange

یعنی Orange فقط برای جاهایی که واقعاً باید توجه کاربر را بگیرد.

---

## 19. چیزهایی که نباید اتفاق بیفتد

* دکمه اصلی همه صفحات نارنجی نشود.
* متن سفید روی دکمه طلایی روشن استفاده نشود.
* آبی Tailwind قدیمی یا Teal برند برای cold lead استفاده نشود.
* بنفش Secondary قدیمی حذف شود.
* Emerald قدیمی در Hero یا Progress باقی نماند.
* دارک مود فقط با تغییر background انجام نشود؛ text، border، surface و shadow هم باید جدا تنظیم شوند.
* رنگ‌های hardcode جدید اضافه نشوند؛ همه چیز از tokenها بیاید.

---

## 20. خلاصه اجرایی

برای اپ Saat:

```text
Primary / Teal = هویت اصلی، دکمه‌های اصلی، تماس، ذخیره، ادامه
Gold = درآمد، کمیسیون، موفقیت مالی، highlight هوشمند
Orange = فروش، CTA خاص، لید داغ، conversion
Green Success = موفقیت واقعی سیستم
Red Error = خطا و عملیات خطرناک
Neutral = متن، بک‌گراند، کارت، border
```

هر صفحه فقط یک اکشن اصلی داشته باشد.
اکشن اصلی معمولاً Teal است.
اگر آن اکشن مستقیم فروش یا پول ایجاد می‌کند، Gold/Orange باشد.

---

## پیاده‌سازی در کد

| منبع | مسیر |
|------|------|
| Tailwind tokens | `tailwind.config.js` |
| CSS variables (light/dark) | `src/index.css` |
| توکن‌های JS | `src/lib/colors.ts` |
| دکمه‌ها | `src/components/ui/Button.tsx` |
| Toast | `src/components/ui/Toast.tsx` |
| Badge / Chip | `src/components/ui/Badge.tsx`, `Chip.tsx` |
| ProgressRing | `src/components/ui/ProgressRing.tsx` |
| آواتار | `src/components/ui/Avatar.tsx` |

فعال‌سازی دارک مود: `document.documentElement.setAttribute('data-theme', 'dark')`
