<?php

namespace App\Enums;

enum ReferralConversionStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
