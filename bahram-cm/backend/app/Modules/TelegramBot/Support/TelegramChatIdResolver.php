<?php

namespace App\Modules\TelegramBot\Support;

class TelegramChatIdResolver
{
    public static function resolve(string $chatId, ?string $inviteLink = null): string
    {
        $chatId = trim($chatId);
        $inviteLink = $inviteLink !== null ? trim($inviteLink) : null;

        if ($inviteLink !== null && $inviteLink !== '' && self::looksInvalidChatId($chatId)) {
            $fromLink = self::usernameFromPublicInviteLink($inviteLink);
            if ($fromLink !== null) {
                return $fromLink;
            }
        }

        return self::normalize($chatId);
    }

    public static function normalize(string $chatId): string
    {
        $chatId = trim($chatId);

        if ($chatId === '') {
            return $chatId;
        }

        if (str_starts_with($chatId, '@') || str_starts_with($chatId, '-')) {
            return $chatId;
        }

        if (ctype_digit($chatId)) {
            return $chatId;
        }

        return '@'.ltrim($chatId, '@');
    }

    public static function usernameFromPublicInviteLink(string $url): ?string
    {
        if (! preg_match('~(?:https?://)?(?:www\.)?t\.me/([^/?+#]+)~i', trim($url), $matches)) {
            return null;
        }

        $slug = $matches[1];

        if ($slug === '' || str_starts_with($slug, '+') || str_starts_with($slug, 'joinchat')) {
            return null;
        }

        return '@'.ltrim($slug, '@');
    }

    public static function looksInvalidChatId(string $chatId): bool
    {
        $chatId = trim($chatId);

        if ($chatId === '') {
            return true;
        }

        if (str_starts_with($chatId, '@')) {
            return false;
        }

        if (! preg_match('/^-?\d+$/', $chatId)) {
            return false;
        }

        if (str_starts_with($chatId, '-100')) {
            return false;
        }

        $absolute = (int) ltrim($chatId, '-');

        return $absolute < 1000;
    }
}
