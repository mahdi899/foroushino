<?php

namespace App\Enums;

enum SatApplicationStatus: string
{
    case Received = 'received';
    case Reviewing = 'reviewing';
    case Accepted = 'accepted';
    case Rejected = 'rejected';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
