<?php

namespace App\Enums;

enum MediaType: string
{
    case Image = 'image';
    case Video = 'video';
    case Lottie = 'lottie';
    case Document = 'document';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
