<?php

namespace App\Support;

/**
 * Normalizes Iranian mobile numbers to the canonical local format
 * `09xxxxxxxxx`, accepting +98/0098/98 country-code prefixes and stripping
 * spaces/dashes.
 */
class Mobile
{
    public static function normalize(?string $raw): ?string
    {
        if (blank($raw)) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $raw) ?? '';

        if (str_starts_with($digits, '0098')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '98') && strlen($digits) === 12) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        if (! preg_match('/^09\d{9}$/', $digits)) {
            if (static::isDevMode() && strlen($digits) >= 1) {
                return '09'.str_pad(substr($digits, -9), 9, '0', STR_PAD_LEFT);
            }

            return null;
        }

        return $digits;
    }

    private static function isDevMode(): bool
    {
        return config('bahram.otp.dev_mode') && app()->environment('local', 'testing');
    }

    public static function isValid(?string $raw): bool
    {
        return static::normalize($raw) !== null;
    }
}
