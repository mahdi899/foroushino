<?php

namespace App\Enums;

enum AdminTelegramEventCategory: string
{
    case Commerce = 'commerce';
    case Support = 'support';
    case Users = 'users';

    public function label(): string
    {
        return match ($this) {
            self::Commerce => 'فروش و سفارش',
            self::Support => 'پشتیبانی',
            self::Users => 'دانشجو و پروفایل',
        };
    }

    public function sortOrder(): int
    {
        return match ($this) {
            self::Commerce => 1,
            self::Support => 2,
            self::Users => 3,
        };
    }
}
