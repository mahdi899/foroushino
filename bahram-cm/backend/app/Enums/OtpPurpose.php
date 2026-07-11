<?php

namespace App\Enums;

enum OtpPurpose: string
{
    case Login = 'login';
    case VerifyMobile = 'verify_mobile';
    case GuestCheckout = 'guest_checkout';
    case ChangePassword = 'change_password';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
