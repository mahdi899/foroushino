<?php

namespace App\Modules\TelegramBot\Support;

final class TelegramSiteUrl
{
    public static function frontendBase(): string
    {
        return rtrim((string) config(
            'telegram.site_base_url',
            config('bahram.frontend_url', config('app.frontend_url', env('FRONTEND_URL', 'https://fashio.ir'))),
        ), '/');
    }

    public static function resolve(?string $landingHref, ?string $slug, string $purchaseSegment = 'purchase'): ?string
    {
        $base = self::frontendBase();
        if ($base === '') {
            return null;
        }

        $href = trim((string) $landingHref);
        if ($href !== '') {
            if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
                return $href;
            }

            return $base.'/'.ltrim($href, '/');
        }

        if (filled($slug)) {
            return $base.'/'.trim($purchaseSegment, '/').'/'.ltrim((string) $slug, '/');
        }

        return null;
    }

    public static function seminarPage(?string $seminarSlug): ?string
    {
        if (! filled($seminarSlug)) {
            return null;
        }

        $base = self::frontendBase();
        if ($base === '') {
            return null;
        }

        return $base.'/seminars/'.ltrim((string) $seminarSlug, '/');
    }

    public static function page(string $path): ?string
    {
        $base = self::frontendBase();
        if ($base === '') {
            return null;
        }

        return $base.'/'.ltrim($path, '/');
    }

    public static function familyHome(): ?string
    {
        return self::page('family');
    }

    public static function studentPanel(): ?string
    {
        return self::page('panel');
    }

    public static function satPage(): ?string
    {
        return self::page('panel/sat');
    }

    public static function identityPage(): ?string
    {
        return self::page('telegram/identity');
    }

    public static function adminTelegram(): ?string
    {
        return self::page('admin/telegram');
    }

    /**
     * Inline keyboard with a URL button below the message (membership-style).
     *
     * @param  list<list<array{text: string, url?: string, callback_data?: string}>>  $extraRows
     * @return array<string, mixed>
     */
    public static function linkMarkup(?string $url, string $label, array $extraRows = []): array
    {
        $keyboard = $extraRows;

        $button = self::inlineButton($label, $url);
        if ($button !== null) {
            array_unshift($keyboard, [$button]);
        }

        if ($keyboard === []) {
            return [];
        }

        return ['reply_markup' => ['inline_keyboard' => $keyboard]];
    }

    public static function isInlineButtonUrl(?string $url): bool
    {
        if ($url === null || trim($url) === '') {
            return false;
        }

        $url = trim($url);
        if (! str_starts_with($url, 'https://') && ! str_starts_with($url, 'http://')) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        if ($host === '') {
            return false;
        }

        return ! in_array($host, ['localhost', '127.0.0.1', '0.0.0.0'], true);
    }

    /** @return array{text: string, url: string}|null */
    public static function inlineButton(string $label, ?string $url): ?array
    {
        return self::isInlineButtonUrl($url) ? ['text' => $label, 'url' => (string) $url] : null;
    }

    /**
     * One full-width URL button row (membership / payment style).
     *
     * @return list<list<array{text: string, url: string}>>
     */
    public static function urlKeyboardRow(string $label, ?string $url): array
    {
        $button = self::inlineButton($label, $url);

        return $button !== null ? [[$button]] : [];
    }
}
