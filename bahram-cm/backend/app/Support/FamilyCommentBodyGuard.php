<?php

namespace App\Support;

/**
 * Detects phone numbers in family comment bodies (Persian/Latin digits).
 */
class FamilyCommentBodyGuard
{
    public static function containsPhoneNumber(string $body): bool
    {
        $text = self::toLatinDigits($body);
        $compact = preg_replace('/\D+/', '', $text) ?? '';

        if ($compact !== '' && preg_match_all('/0?9\d{9}/', $compact, $matches)) {
            foreach ($matches[0] as $candidate) {
                if (Mobile::isValid($candidate)) {
                    return true;
                }
            }
        }

        if (preg_match('/(?:\+|00)?98[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}/u', $text)) {
            return true;
        }

        if (preg_match('/(?<![\d.])0?9[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{4}(?![\d.])/u', $text)) {
            return true;
        }

        if (preg_match('/(?<![\d.])0\d{2,3}[\s\-.]?\d{7,8}(?![\d.])/u', $text)) {
            return true;
        }

        return false;
    }

    private static function toLatinDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }
}
