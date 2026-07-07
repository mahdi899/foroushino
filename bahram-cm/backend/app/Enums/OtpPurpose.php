<?php

namespace App\Enums;

enum OtpPurpose: string
{
    case Login = 'login';
    case VerifyMobile = 'verify_mobile';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
