<?php

namespace App\Enums;

enum DiscountType: string
{
    case Percent = 'percent';
    case Fixed = 'fixed';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
