<?php

namespace App\Enums;

enum SpotplayerLicenseStatus: string
{
    case Active = 'active';
    case Failed = 'failed';
    case Revoked = 'revoked';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
