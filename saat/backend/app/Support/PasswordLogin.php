<?php

namespace App\Support;

use App\Models\User;

/** Whether a user may authenticate with phone + password (in addition to OTP when linked). */
final class PasswordLogin
{
    public static function enabledForUser(?User $user): bool
    {
        if (! $user?->is_active) {
            return false;
        }

        if ($user->phone_otp_exempt) {
            return true;
        }

        return self::isConfiguredExemptPhone($user->phone);
    }

    public static function isConfiguredExemptPhone(?string $phone): bool
    {
        if ($phone === null || $phone === '') {
            return false;
        }

        $normalized = PhoneNormalizer::normalize($phone);
        $configured = config('saat.password_login_phones', []);

        foreach ($configured as $candidate) {
            if (PhoneNormalizer::normalize((string) $candidate) === $normalized) {
                return true;
            }
        }

        return false;
    }
}
