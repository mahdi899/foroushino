<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * Normalizes Iranian mobile numbers to the canonical local format
 * `09xxxxxxxxx` — the same format Iran (bahram-cm) stores/keys on.
 *
 * Telegram's `contact.phone_number` for Iranian numbers is usually
 * delivered as `989xxxxxxxxx` (no leading `+`/`0`). Without normalizing
 * this on the host before storing/looking things up locally, the mobile
 * ends up saved as `98...`/`+98...` instead of `09...`, which breaks
 * anything keyed by mobile (e.g. {@see \TelegramHost\Account\PendingMobileAccess})
 * and shows an inconsistent format to admins/support.
 */
final class MobileNormalizer
{
    public static function normalize(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';

        if (str_starts_with($digits, '0098')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '98') && strlen($digits) === 12) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        if (preg_match('/^09\d{9}$/', $digits) === 1) {
            return $digits;
        }

        return null;
    }

    /**
     * Non-Iran mode: accept 8–15 digit international numbers (same rule as Iran backend).
     */
    public static function normalizeInternational(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $iran = self::normalize($raw);
        if ($iran !== null) {
            return $iran;
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if (preg_match('/^\d{8,15}$/', $digits) === 1) {
            return $digits;
        }

        return null;
    }

    public static function normalizeForRegistration(?string $raw, bool $iranOnly): ?string
    {
        return $iranOnly ? self::normalize($raw) : self::normalizeInternational($raw);
    }

    /** Falls back to a trimmed original value when it doesn't look like an Iranian mobile. */
    public static function normalizeOrOriginal(string $raw): string
    {
        return self::normalize($raw) ?? trim($raw);
    }
}
