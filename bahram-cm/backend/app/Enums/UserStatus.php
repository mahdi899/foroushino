<?php

namespace App\Enums;

enum UserStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
    case Blocked = 'blocked';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
