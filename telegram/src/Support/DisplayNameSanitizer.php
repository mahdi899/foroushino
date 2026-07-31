<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * Mirrors Iran's DisplayNameValidator — safe Persian/Latin names only.
 */
final class DisplayNameSanitizer
{
    private const MIN_LENGTH = 2;

    private const MAX_LENGTH = 60;

    private const PATTERN = '/^[\p{Arabic}\p{L}\s\x{200C}\-]+$/u';

    public static function sanitize(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $normalized = self::normalize($name);

        return self::isValid($normalized) ? $normalized : null;
    }

    public static function normalize(string $name): string
    {
        $stripped = preg_replace('/\p{C}+/u', '', $name) ?? $name;

        return preg_replace('/\s+/u', ' ', trim($stripped)) ?? trim($stripped);
    }

    public static function isValid(string $name): bool
    {
        $trimmed = trim($name);
        $length = mb_strlen($trimmed);

        if ($length < self::MIN_LENGTH || $length > self::MAX_LENGTH) {
            return false;
        }

        if (preg_match('/\d/u', $trimmed)) {
            return false;
        }

        if (preg_match('/https?:\/\//iu', $trimmed)) {
            return false;
        }

        if (preg_match('/[\x{1F300}-\x{1FAFF}]/u', $trimmed)) {
            return false;
        }

        if (preg_match('/[<>"\'&`\\\\{}\[\]()=;]/u', $trimmed)) {
            return false;
        }

        if (preg_match('/javascript|script|onerror|onload/i', $trimmed)) {
            return false;
        }

        if (preg_match('/\p{C}/u', $trimmed)) {
            return false;
        }

        return (bool) preg_match(self::PATTERN, $trimmed);
    }
}
