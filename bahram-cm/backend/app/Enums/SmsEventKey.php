<?php

namespace App\Enums;

enum SmsEventKey: string
{
    case Otp = 'otp';
    case PurchaseConfirmation = 'purchase_confirmation';
    case LicenseCreated = 'license_created';
    case Welcome = 'welcome';
    case TicketCreated = 'ticket_created';
    case TicketReply = 'ticket_reply';
    case Broadcast = 'broadcast';

    public function label(): string
    {
        return match ($this) {
            self::Otp => 'کد یک‌بارمصرف (OTP)',
            self::PurchaseConfirmation => 'تأیید خرید / پرداخت موفق',
            self::LicenseCreated => 'صدور لایسنس SpotPlayer',
            self::Welcome => 'خوش‌آمدگویی (اولین ورود)',
            self::TicketCreated => 'ثبت تیکت پشتیبانی',
            self::TicketReply => 'پاسخ ادمین به تیکت',
            self::Broadcast => 'ارسال دستی (مرکز پیامک)',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Otp => 'ارسال کد ورود به پنل دانشجو',
            self::PurchaseConfirmation => 'پس از پرداخت موفق و تکمیل سفارش',
            self::LicenseCreated => 'پس از صدور لایسنس SpotPlayer (جدا از پیامک خرید)',
            self::Welcome => 'اولین ورود دانشجو به پنل',
            self::TicketCreated => 'تأیید ثبت تیکت برای دانشجو',
            self::TicketReply => 'اطلاع‌رسانی پاسخ پشتیبانی به دانشجو',
            self::Broadcast => 'پیامک‌های دستی از مرکز پیامک',
        };
    }

    public function defaultTemplate(): string
    {
        return match ($this) {
            self::Otp => 'کد ورود شما به آکادمی بهرام رستمی: {code}\nاین کد را در اختیار دیگران قرار ندهید.',
            self::PurchaseConfirmation => 'سلام {name}، خرید شما با شماره سفارش {order_number} با موفقیت ثبت شد. کد فعال‌سازی: {code}',
            self::LicenseCreated => 'سلام {name}، لایسنس دوره {product_title} صادر شد. کد: {code}',
            self::Welcome => 'سلام {name} عزیز؛ به آکادمی بهرام رستمی خوش آمدی! برای شروع به پنل کاربری خودت سر بزن.',
            self::TicketCreated => 'تیکت پشتیبانی شما با موضوع «{subject}» ثبت شد. به‌زودی پاسخ می‌دهیم.',
            self::TicketReply => 'پاسخ جدید برای تیکت «{subject}» در پنل دانشجو ثبت شد.',
            self::Broadcast => '{message}',
        };
    }

    public function defaultEnabled(): bool
    {
        return match ($this) {
            self::Otp, self::PurchaseConfirmation, self::Welcome => true,
            self::LicenseCreated, self::TicketCreated, self::TicketReply => false,
            self::Broadcast => true,
        };
    }

    public function defaultFallbackEnabled(): bool
    {
        return $this === self::Otp;
    }

    public function category(): SmsEventCategory
    {
        return match ($this) {
            self::Otp => SmsEventCategory::Auth,
            self::PurchaseConfirmation, self::LicenseCreated => SmsEventCategory::Commerce,
            self::Welcome => SmsEventCategory::Onboarding,
            self::TicketCreated, self::TicketReply => SmsEventCategory::Support,
            self::Broadcast => SmsEventCategory::Manual,
        };
    }

    /** @return list<string> */
    public function placeholders(): array
    {
        return match ($this) {
            self::Otp => ['{code}'],
            self::PurchaseConfirmation => ['{name}', '{phone}', '{order_number}', '{product_title}', '{code}'],
            self::LicenseCreated => ['{name}', '{product_title}', '{code}', '{order_number}'],
            self::Welcome => ['{name}'],
            self::TicketCreated, self::TicketReply => ['{name}', '{subject}', '{ticket_id}'],
            self::Broadcast => ['{message}'],
        };
    }

    /** @return list<self> */
    public static function configurable(): array
    {
        return [
            self::Otp,
            self::PurchaseConfirmation,
            self::LicenseCreated,
            self::Welcome,
            self::TicketCreated,
            self::TicketReply,
        ];
    }
}
