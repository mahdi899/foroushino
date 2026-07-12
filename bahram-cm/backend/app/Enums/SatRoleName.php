<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SatRoleName: string
{
    use EnumValues;

    case Specialist = 'sat-specialist';
    case Leader = 'sat-leader';
    case Management = 'sat-management';
    case SuperAdmin = 'sat-super-admin';

    public function label(): string
    {
        return match ($this) {
            self::Specialist => 'کارشناس',
            self::Leader => 'لیدر',
            self::Management => 'مدیریت',
            self::SuperAdmin => 'ادمین کل',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Specialist => 'مدیریت سرنخ‌ها و تماس‌های خود؛ ثبت فعالیت برای بررسی لیدر',
            self::Leader => 'نظارت بر کارشناسان تیم؛ بررسی تماس‌ها و تأیید/رد فعالیت‌ها',
            self::Management => 'دسترسی لیدر به‌علاوه افزودن کارشناس/لیدر، سرنخ، واریز و برداشت',
            self::SuperAdmin => 'دسترسی کامل به تمام امکانات سات و تنظیمات سیستم',
        };
    }

    public function rank(): int
    {
        return match ($this) {
            self::Specialist => 1,
            self::Leader => 2,
            self::Management => 3,
            self::SuperAdmin => 4,
        };
    }
}
