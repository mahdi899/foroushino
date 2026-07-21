<?php

namespace App\Modules\TelegramBot\Support;

final class TelegramSiteUrl
{
    public static function frontendBase(): string
    {
        $candidates = [
            config('telegram.site_base_url'),
            config('bahram.frontend_url'),
            config('app.frontend_url'),
            env('FRONTEND_URL'),
            'https://rostami.app',
        ];

        foreach ($candidates as $candidate) {
            $base = rtrim(trim((string) $candidate), '/');
            if ($base !== '' && self::isPublicWebBase($base)) {
                return $base;
            }
        }

        return 'https://rostami.app';
    }

    public static function isPublicWebBase(string $url): bool
    {
        if (! preg_match('#^https?://#i', $url)) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return $host !== '' && ! in_array($host, ['localhost', '127.0.0.1', '0.0.0.0'], true);
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

    /**
     * Family PWA home. Option B (dual-domain): the family app lives on its
     * own apex (`FAMILY_ENTRY_BASE_URL`, e.g. https://rostami.club), not
     * under the main site's `/family` path — do not fall back to
     * {@see page()} here or bot links will 404/redirect incorrectly.
     */
    public static function familyHome(): ?string
    {
        $base = rtrim((string) config('family.entry.base_url', ''), '/');
        if ($base === '' || ! self::isPublicWebBase($base)) {
            return self::page('family');
        }

        $path = trim((string) config('family.entry.path', ''), '/');

        return $path === '' ? $base : $base.'/'.$path;
    }

    public static function studentPanel(): ?string
    {
        return self::page('panel');
    }

    public static function courseWatchPage(int|string $accessId): ?string
    {
        $id = trim((string) $accessId);
        if ($id === '' || ! ctype_digit($id)) {
            return null;
        }

        return self::page('panel/courses/'.$id.'/watch');
    }

    public static function coursesPanel(): ?string
    {
        return self::page('panel/courses');
    }

    public static function satPage(): ?string
    {
        return self::page('panel/sat');
    }

    public static function identityPage(): ?string
    {
        return self::page('panel/identity-verification');
    }

    public static function telegramLoginPage(?string $token = null): ?string
    {
        $path = 'panel';
        if (filled($token)) {
            $path .= '?tg_login='.urlencode((string) $token);
        }

        return self::page($path);
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
    public static function linkMarkup(?string $url, string $label, array $extraRows = [], ?string $style = null, ?string $iconKey = null): array
    {
        $keyboard = $extraRows;

        $button = self::inlineButton($label, $url, $style, $iconKey);
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

    /** @return array{text: string, url: string, style?: string, icon_custom_emoji_id?: string}|null */
    public static function inlineButton(string $label, ?string $url, ?string $style = null, ?string $iconKey = null): ?array
    {
        if (! self::isInlineButtonUrl($url)) {
            return null;
        }

        $button = ['text' => $label, 'url' => (string) $url];

        if ($style !== null && in_array($style, ['primary', 'success', 'danger'], true)) {
            $button['style'] = $style;
        }

        if ($iconKey !== null) {
            $button = [...$button, ...\App\Modules\TelegramBot\Support\TelegramCustomEmoji::buttonIcon($iconKey)];
        }

        return $button;
    }

    /**
     * One full-width URL button row (membership / payment style).
     *
     * @return list<list<array{text: string, url: string, style?: string, icon_custom_emoji_id?: string}>>
     */
    public static function urlKeyboardRow(string $label, ?string $url, ?string $style = null, ?string $iconKey = null): array
    {
        $button = self::inlineButton($label, $url, $style, $iconKey);

        return $button !== null ? [[$button]] : [];
    }
}
