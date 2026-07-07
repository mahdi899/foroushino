<?php

namespace App\Enums;

enum ProductType: string
{
    case CourseSpotplayer = 'course_spotplayer';
    case ManualService = 'manual_service';
    case Event = 'event';

    /** Legacy values kept for backward compatibility with existing products. */
    case Normal = 'normal';
    case Package = 'package';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
