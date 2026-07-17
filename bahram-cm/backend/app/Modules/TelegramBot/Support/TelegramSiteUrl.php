<?php

namespace App\Modules\TelegramBot\Support;

final class TelegramSiteUrl
{
    public static function frontendBase(): string
    {
        return rtrim((string) config('bahram.frontend_url', config('app.frontend_url', env('FRONTEND_URL', ''))), '/');
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
     * Always append a browseable link in the message body (works even for localhost).
     */
    public static function withLink(string $message, ?string $url, string $label = 'مشاهده صفحه'): string
    {
        if ($url === null || trim($url) === '') {
            return $message;
        }

        return rtrim($message)."\n\n🔗 {$label}:\n{$url}";
    }

    public static function isInlineButtonUrl(?string $url): bool
    {
        if ($url === null || trim($url) === '') {
            return false;
        }

        if (! str_starts_with($url, 'https://')) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return $host !== ''
            && ! in_array($host, ['localhost', '127.0.0.1', '0.0.0.0'], true);
    }

    /** @return array{text: string, url: string}|null */
    public static function inlineButton(string $label, ?string $url): ?array
    {
        return self::isInlineButtonUrl($url) ? ['text' => $label, 'url' => (string) $url] : null;
    }
}
