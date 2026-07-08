<?php

namespace App\Enums;

enum AdminTelegramEventKey: string
{
    case OrderCreated = 'order_created';
    case PaymentStarted = 'payment_started';
    case OrderPaid = 'order_paid';
    case OrderFulfilled = 'order_fulfilled';
    case PaymentCancelled = 'payment_cancelled';
    case PaymentFailed = 'payment_failed';
    case OrderUpdated = 'order_updated';
    case LicenseIssued = 'license_issued';
    case ProfileCompleted = 'profile_completed';
    case TicketCreated = 'ticket_created';
    case TicketStudentReply = 'ticket_student_reply';
    case TicketAdminReply = 'ticket_admin_reply';
    case StudentRegistered = 'student_registered';
    case StudentFirstLogin = 'student_first_login';
    case ProfileUpdated = 'profile_updated';
    case SatApplicationSubmitted = 'sat_application_submitted';

    public function label(): string
    {
        return match ($this) {
            self::OrderCreated => 'سفارش جدید',
            self::PaymentStarted => 'شروع پرداخت',
            self::OrderPaid => 'پرداخت موفق',
            self::OrderFulfilled => 'تحویل / تکمیل سفارش',
            self::PaymentCancelled => 'لغو پرداخت',
            self::PaymentFailed => 'پرداخت ناموفق',
            self::OrderUpdated => 'تغییر وضعیت سفارش (ادمین)',
            self::LicenseIssued => 'صدور لایسنس SpotPlayer',
            self::ProfileCompleted => 'تکمیل پروفایل پس از خرید',
            self::TicketCreated => 'تیکت جدید',
            self::TicketStudentReply => 'پاسخ دانشجو به تیکت',
            self::TicketAdminReply => 'پاسخ ادمین به تیکت',
            self::StudentRegistered => 'ثبت‌نام دانشجو جدید',
            self::StudentFirstLogin => 'اولین ورود دانشجو',
            self::ProfileUpdated => 'به‌روزرسانی پروفایل',
            self::SatApplicationSubmitted => 'درخواست سات جدید',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::OrderCreated => 'وقتی کاربر سفارش جدید ثبت می‌کند (قبل از پرداخت)',
            self::PaymentStarted => 'وقتی کاربر به درگاه پرداخت هدایت می‌شود',
            self::OrderPaid => 'وقتی پرداخت با موفقیت تأیید می‌شود',
            self::OrderFulfilled => 'وقتی سفارش تحویل و تکمیل می‌شود',
            self::PaymentCancelled => 'وقتی کاربر پرداخت را در درگاه لغو می‌کند',
            self::PaymentFailed => 'وقتی تأیید پرداخت ناموفق است',
            self::OrderUpdated => 'وقتی ادمین وضعیت سفارش را تغییر می‌دهد',
            self::LicenseIssued => 'وقتی لایسنس SpotPlayer صادر می‌شود',
            self::ProfileCompleted => 'وقتی مشتری اطلاعات خود را پس از خرید تکمیل می‌کند',
            self::TicketCreated => 'وقتی دانشجو تیکت پشتیبانی ثبت می‌کند',
            self::TicketStudentReply => 'وقتی دانشجو به تیکت پاسخ می‌دهد',
            self::TicketAdminReply => 'وقتی ادمین به تیکت پاسخ می‌دهد',
            self::StudentRegistered => 'وقتی دانشجو برای اولین بار ثبت‌نام می‌کند',
            self::StudentFirstLogin => 'وقتی دانشجو برای اولین بار وارد پنل می‌شود',
            self::ProfileUpdated => 'وقتی دانشجو پروفایل خود را ویرایش می‌کند',
            self::SatApplicationSubmitted => 'وقتی دانشجو درخواست سات ثبت می‌کند',
        };
    }

    public function emoji(): string
    {
        return match ($this) {
            self::OrderCreated => '🛒',
            self::PaymentStarted => '💳',
            self::OrderPaid => '✅',
            self::OrderFulfilled => '📦',
            self::PaymentCancelled => '🚫',
            self::PaymentFailed => '❌',
            self::OrderUpdated => '📝',
            self::LicenseIssued => '🔑',
            self::ProfileCompleted => '👤',
            self::TicketCreated => '🎫',
            self::TicketStudentReply => '💬',
            self::TicketAdminReply => '🛡️',
            self::StudentRegistered => '🆕',
            self::StudentFirstLogin => '🎉',
            self::ProfileUpdated => '✏️',
            self::SatApplicationSubmitted => '🎓',
        };
    }

    public function defaultEnabled(): bool
    {
        return true;
    }

    public function category(): AdminTelegramEventCategory
    {
        return match ($this) {
            self::OrderCreated, self::PaymentStarted, self::OrderPaid, self::OrderFulfilled,
            self::PaymentCancelled, self::PaymentFailed, self::OrderUpdated, self::LicenseIssued,
            self::ProfileCompleted => AdminTelegramEventCategory::Commerce,
            self::TicketCreated, self::TicketStudentReply, self::TicketAdminReply => AdminTelegramEventCategory::Support,
            self::StudentRegistered, self::StudentFirstLogin, self::ProfileUpdated,
            self::SatApplicationSubmitted => AdminTelegramEventCategory::Users,
        };
    }

    /** @return list<self> */
    public static function all(): array
    {
        return self::cases();
    }
}
