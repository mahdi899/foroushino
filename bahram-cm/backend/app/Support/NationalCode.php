<?php

namespace App\Support;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use InvalidArgumentException;

/**
 * Iranian national code helpers: normalize, checksum validation, mask, HMAC hash, encrypt/decrypt.
 */
class NationalCode
{
    public static function normalize(?string $raw): ?string
    {
        if (blank($raw)) {
            return null;
        }

        $digits = preg_replace('/\D/u', '', self::toEnglishDigits(trim($raw))) ?? '';

        if (strlen($digits) !== 10) {
            return null;
        }

        return $digits;
    }

    public static function isValid(?string $raw): bool
    {
        $code = self::normalize($raw);
        if ($code === null) {
            return false;
        }

        // Reject all-identical digits (e.g. 0000000000).
        if (preg_match('/^(\d)\1{9}$/', $code) === 1) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += (int) $code[$i] * (10 - $i);
        }

        $remainder = $sum % 11;
        $check = (int) $code[9];

        return $remainder < 2
            ? $check === $remainder
            : $check === (11 - $remainder);
    }

    /** Mask for display, e.g. 001******7 */
    public static function mask(?string $raw): ?string
    {
        $code = self::normalize($raw);
        if ($code === null) {
            return null;
        }

        return substr($code, 0, 3).'******'.substr($code, -1);
    }

    public static function hash(string $raw): string
    {
        $code = self::normalize($raw);
        if ($code === null) {
            throw new InvalidArgumentException('Cannot hash an invalid national code.');
        }

        return hash_hmac('sha256', $code, self::hmacKey());
    }

    public static function encrypt(string $raw): string
    {
        $code = self::normalize($raw);
        if ($code === null) {
            throw new InvalidArgumentException('Cannot encrypt an invalid national code.');
        }

        return Crypt::encryptString($code);
    }

    public static function decrypt(?string $encrypted): ?string
    {
        if (blank($encrypted)) {
            return null;
        }

        try {
            $plain = Crypt::decryptString($encrypted);
        } catch (DecryptException) {
            return null;
        }

        return self::normalize($plain);
    }

    private static function hmacKey(): string
    {
        $key = (string) (config('bahram.identity.national_code_hmac_key') ?: config('app.key'));

        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7), true);
            if ($decoded !== false && $decoded !== '') {
                return $decoded;
            }
        }

        return $key;
    }

    private static function toEnglishDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }
}
