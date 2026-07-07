<?php

namespace App\Enums;

enum CourseAccessSource: string
{
    case Zarinpal = 'zarinpal';
    case Manual = 'manual';
    case Import = 'import';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
