<?php

namespace App\Support;

/**
 * Normalizes Persian/Arabic-script names for loose equality comparisons
 * (e.g. comparing user-submitted names against Shahkar/PersonInfo results).
 */
final class PersianName
{
    public static function normalize(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        $value = trim($value);
        $value = strtr($value, [
            'ي' => 'ی',
            'ك' => 'ک',
            'ة' => 'ه',
            'ۀ' => 'ه',
            'إ' => 'ا',
            'أ' => 'ا',
            'آ' => 'ا',
            'ٱ' => 'ا',
            "\u{200C}" => ' ', // ZWNJ (نیم‌فاصله)
        ]);

        // Collapse whitespace, drop diacritics/tatweel, casefold ascii.
        $value = preg_replace('/[\x{064B}-\x{065F}\x{0640}]/u', '', $value) ?? $value;
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return mb_strtolower(trim($value), 'UTF-8');
    }

    public static function equal(?string $a, ?string $b): bool
    {
        return self::normalize($a) !== '' && self::normalize($a) === self::normalize($b);
    }
}
