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
    case IdentityVerificationSubmitted = 'identity_verification_submitted';
    case IdentityVerificationApproved = 'identity_verification_approved';
    case IdentityVerificationNeedsCorrection = 'identity_verification_needs_correction';
    case IdentityVerificationRejected = 'identity_verification_rejected';
    case SatMembershipActivated = 'sat_membership_activated';
    case OwnershipVerificationLocked = 'ownership_verification_locked';

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
            self::IdentityVerificationSubmitted => 'ثبت درخواست احراز هویت',
            self::IdentityVerificationApproved => 'تأیید احراز هویت',
            self::IdentityVerificationNeedsCorrection => 'نیاز به اصلاح مدارک احراز هویت',
            self::IdentityVerificationRejected => 'رد احراز هویت',
            self::SatMembershipActivated => 'فعال‌سازی عضویت سات',
            self::OwnershipVerificationLocked => 'قفل تطبیق شماره موبایل',
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
            self::IdentityVerificationSubmitted => 'پس از ارسال مدارک احراز هویت توسط دانشجو',
            self::IdentityVerificationApproved => 'پس از تأیید مدارک توسط اپراتور',
            self::IdentityVerificationNeedsCorrection => 'وقتی مدارک نیاز به اصلاح دارند',
            self::IdentityVerificationRejected => 'وقتی درخواست احراز هویت رد می‌شود',
            self::SatMembershipActivated => 'وقتی عضویت سات پس از تأیید هویت فعال می‌شود',
            self::OwnershipVerificationLocked => 'پس از قفل شدن تطبیق شماره به‌دلیل تلاش‌های ناموفق',
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
            self::IdentityVerificationSubmitted => 'سلام {name}، درخواست تأیید حساب شما ثبت شد و در صف بررسی قرار گرفت.',
            self::IdentityVerificationApproved => 'سلام {name}، حساب شما با موفقیت تأیید شد.',
            self::IdentityVerificationNeedsCorrection => 'سلام {name}، برای تکمیل تأیید حساب، لازم است مدارک خود را اصلاح کنید. جزئیات در پنل کاربری شماست.',
            self::IdentityVerificationRejected => 'سلام {name}، متأسفانه درخواست تأیید حساب شما رد شد. در صورت نیاز با پشتیبانی تماس بگیرید.',
            self::SatMembershipActivated => 'سلام {name}، عضویت سات شما فعال شد.',
            self::OwnershipVerificationLocked => 'سلام {name}، امکان تطبیق شماره موبایل موقتاً محدود شده است. لطفاً با پشتیبانی تماس بگیرید.',
        };
    }

    public function defaultEnabled(): bool
    {
        return match ($this) {
            self::Otp, self::PurchaseConfirmation, self::Welcome => true,
            self::LicenseCreated, self::TicketCreated, self::TicketReply => false,
            self::Broadcast => true,
            self::IdentityVerificationSubmitted,
            self::IdentityVerificationApproved,
            self::IdentityVerificationNeedsCorrection,
            self::IdentityVerificationRejected,
            self::SatMembershipActivated,
            self::OwnershipVerificationLocked => true,
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
            self::Welcome,
            self::IdentityVerificationSubmitted,
            self::IdentityVerificationApproved,
            self::IdentityVerificationNeedsCorrection,
            self::IdentityVerificationRejected,
            self::SatMembershipActivated,
            self::OwnershipVerificationLocked => SmsEventCategory::Onboarding,
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
            self::IdentityVerificationSubmitted,
            self::IdentityVerificationApproved,
            self::IdentityVerificationNeedsCorrection,
            self::IdentityVerificationRejected,
            self::SatMembershipActivated,
            self::OwnershipVerificationLocked => ['{name}'],
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
            self::IdentityVerificationSubmitted,
            self::IdentityVerificationApproved,
            self::IdentityVerificationNeedsCorrection,
            self::IdentityVerificationRejected,
            self::SatMembershipActivated,
            self::OwnershipVerificationLocked,
        ];
    }
}
