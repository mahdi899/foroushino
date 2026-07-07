<?php

namespace App\Enums;

enum CourseAccessStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Revoked = 'revoked';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
