<?php

namespace App\Enums;

enum SmsEventCategory: string
{
    case Auth = 'auth';
    case Commerce = 'commerce';
    case Onboarding = 'onboarding';
    case Support = 'support';
    case Manual = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::Auth => 'احراز هویت',
            self::Commerce => 'فروش و سفارش',
            self::Onboarding => 'ورود و خوش‌آمد',
            self::Support => 'پشتیبانی',
            self::Manual => 'ارسال دستی',
        };
    }

    public function sortOrder(): int
    {
        return match ($this) {
            self::Auth => 1,
            self::Commerce => 2,
            self::Onboarding => 3,
            self::Support => 4,
            self::Manual => 5,
        };
    }
}
