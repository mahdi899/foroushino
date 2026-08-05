<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum AdminRoleName: string
{
    use EnumValues;

    case SuperAdmin = 'super-admin';
    case Admin = 'admin';
    case StudentManager = 'student-manager';
    case KycOperator = 'kyc-operator';
    case Support = 'support';
    case TechSupport = 'tech-support';
    case TechManager = 'tech-manager';
    case ContentManager = 'content-manager';
    case FamilyManager = 'family-manager';
    case Finance = 'finance';
    case ReadOnly = 'read-only';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'مدیر کل',
            self::Admin => 'ادمین',
            self::StudentManager => 'مدیر دانشجویان',
            self::KycOperator => 'کارشناس احراز هویت',
            self::Support => 'پشتیبانی',
            self::TechSupport => 'پشتیبان فنی',
            self::TechManager => 'مدیر فنی',
            self::ContentManager => 'مدیر محتوا',
            self::FamilyManager => 'مدیر خانواده',
            self::Finance => 'مالی',
            self::ReadOnly => 'ناظر',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::SuperAdmin => 'بالاترین سطح دسترسی؛ مدیریت نقش‌ها و اطلاعات حساس',
            self::Admin => 'مدیریت عمومی سیستم بدون دسترسی پیش‌فرض به داده‌های فوق‌حساس',
            self::StudentManager => 'مدیریت دانشجویان با امکان Reveal تک‌به‌تک شماره',
            self::KycOperator => 'فقط بررسی و تکمیل احراز هویت مخاطبان؛ بدون دسترسی به سایر بخش‌های پنل',
            self::Support => 'تیکت‌های پشتیبانی، پیام داخلی با تیم فنی، و ارسال پاسخ نهایی به مخاطب',
            self::TechSupport => 'پیام داخلی روی تیکت‌های ارجاع‌شده؛ بدون ارسال مستقیم به مخاطب',
            self::TechManager => 'مدیریت صف فنی و پیام داخلی با پشتیبانی؛ بدون ارسال مستقیم به مخاطب',
            self::ContentManager => 'مدیریت مقالات، دوره‌ها و FAQ',
            self::FamilyManager => 'مدیریت خانواده داداش بهرام؛ انتشار، نظرات و تحلیل',
            self::Finance => 'پرداخت‌ها، تراکنش‌ها و برداشت‌ها',
            self::ReadOnly => 'فقط مشاهده گزارش‌ها و بخش‌های مجاز',
        };
    }
}
