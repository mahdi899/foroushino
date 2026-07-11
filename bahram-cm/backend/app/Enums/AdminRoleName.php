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
    case ContentManager = 'content-manager';
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
            self::ContentManager => 'مدیر محتوا',
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
            self::KycOperator => 'بررسی پرونده‌های احراز هویت و مدارک',
            self::Support => 'پشتیبانی عمومی بدون مشاهده داده‌های حساس',
            self::ContentManager => 'مدیریت مقالات، دوره‌ها و FAQ',
            self::Finance => 'پرداخت‌ها، تراکنش‌ها و برداشت‌ها',
            self::ReadOnly => 'فقط مشاهده گزارش‌ها و بخش‌های مجاز',
        };
    }
}
