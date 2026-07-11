<?php

namespace App\Support;

/**
 * Validates outbound URLs configured by admins to prevent Server-Side Request Forgery (SSRF).
 *
 * Blocks:
 *  - non-HTTPS schemes
 *  - private/loopback/link-local IPv4 ranges
 *  - private IPv6 ranges
 *  - cloud metadata endpoints (169.254.169.254, etc.)
 */
final class SsrfGuard
{
    /** Slugs whose providers support a custom base URL. */
    private const ALLOWED_BASE_URL_SLUGS = [
        'farazsms',
        'ippanel',
        'bale',
        'bale_safir',
        'telegram',
    ];

    /** Known-safe hostname suffixes per provider slug. */
    private const PROVIDER_ALLOWLIST = [
        'farazsms'  => ['farazsms.com'],
        'ippanel'   => ['ippanel.com'],
        'bale'      => ['bale.ai', 'tapi.bale.ai'],
        'bale_safir' => ['bale.ai', 'safir.bale.ai'],
        'telegram'  => ['telegram.org'],
    ];

    /**
     * Validate that a URL is safe for outbound HTTP.
     * Returns null if valid, or an error message string if invalid.
     */
    public static function validate(string $url): ?string
    {
        if (empty(trim($url))) {
            return null;
        }

        $parsed = parse_url($url);

        if ($parsed === false || empty($parsed['host'])) {
            return 'آدرس URL نامعتبر است.';
        }

        $scheme = strtolower($parsed['scheme'] ?? '');
        if ($scheme !== 'https') {
            return 'فقط آدرس‌های HTTPS مجاز هستند.';
        }

        $host = strtolower($parsed['host']);

        if (self::isPrivateOrReservedHost($host)) {
            return 'آدرس IP خصوصی یا رزرو شده مجاز نیست.';
        }

        return null;
    }

    /**
     * Validate a provider-specific base URL against its allowlist.
     * Stricter than the generic validate() — hostname must match known provider domains.
     */
    public static function validateProviderBaseUrl(string $slug, string $url): ?string
    {
        $error = self::validate($url);
        if ($error !== null) {
            return $error;
        }

        if (! in_array($slug, self::ALLOWED_BASE_URL_SLUGS, true)) {
            return "سرویس‌دهنده «{$slug}» از تنظیم آدرس پایه سفارشی پشتیبانی نمی‌کند.";
        }

        $allowedSuffixes = self::PROVIDER_ALLOWLIST[$slug] ?? [];
        if (empty($allowedSuffixes)) {
            return null;
        }

        $host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');

        foreach ($allowedSuffixes as $suffix) {
            if ($host === $suffix || str_ends_with($host, '.'.$suffix)) {
                return null;
            }
        }

        $allowed = implode('، ', $allowedSuffixes);

        return "آدرس پایه باید از دامنه‌های مجاز ({$allowed}) باشد.";
    }

    private static function isPrivateOrReservedHost(string $host): bool
    {
        // Resolve hostname to IP for validation
        $ip = filter_var($host, FILTER_VALIDATE_IP) !== false
            ? $host
            : (gethostbyname($host) ?: $host);

        // Block IPv4 private/reserved ranges
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            return ! filter_var(
                $ip,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
            );
        }

        // Block IPv6 private/loopback/link-local
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            $ipv6Lower = strtolower($ip);

            // ::1 loopback
            if ($ipv6Lower === '::1') {
                return true;
            }

            // Link-local fe80::/10
            if (str_starts_with($ipv6Lower, 'fe80:')) {
                return true;
            }

            // Unique local fc00::/7
            if (str_starts_with($ipv6Lower, 'fc') || str_starts_with($ipv6Lower, 'fd')) {
                return true;
            }
        }

        // Block cloud metadata hostnames explicitly
        $blockedHosts = ['169.254.169.254', 'metadata.google.internal'];
        if (in_array($host, $blockedHosts, true)) {
            return true;
        }

        return false;
    }
}
