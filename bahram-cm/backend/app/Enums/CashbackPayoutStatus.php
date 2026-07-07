<?php

namespace App\Enums;

enum CashbackPayoutStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Paid = 'paid';
    case Rejected = 'rejected';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
