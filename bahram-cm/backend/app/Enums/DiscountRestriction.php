<?php

namespace App\Enums;

enum DiscountRestriction: string
{
    case All = 'all';
    case SpecificUsers = 'specific_users';
    case PriorBuyers = 'prior_buyers';
    case SpecificProducts = 'specific_products';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
