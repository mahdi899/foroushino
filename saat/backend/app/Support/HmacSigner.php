<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * HMAC-SHA256 request signing for server-to-server REST calls between
 * Server 2 (saat) and Server 1 (bahram-cm). The signature covers the
 * timestamp, a per-request nonce, and the exact JSON body so a captured
 * request cannot be replayed or tampered with in transit — this rides on
 * top of (never instead of) the Bearer token and X-Proxy-Origin header.
 *
 * Wire format:
 *   X-Timestamp: <unix seconds>
 *   X-Nonce:     <random 32-hex>
 *   X-Signature: sha256=<hex hmac of "{timestamp}.{nonce}.{rawJsonBody}">
 */
final class HmacSigner
{
    /**
     * Build the headers that must be attached to a signed outbound request.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    public static function headersFor(array $payload, ?string $secret = null): array
    {
        $secret ??= (string) config('security.hmac.secret', '');
        $timestamp = (string) now()->getTimestamp();
        $nonce = Str::random(32);
        $body = self::canonicalBody($payload);

        return [
            (string) config('security.hmac.header_timestamp', 'X-Timestamp') => $timestamp,
            'X-Nonce' => $nonce,
            (string) config('security.hmac.header_signature', 'X-Signature') => 'sha256='.self::sign($timestamp, $nonce, $body, $secret),
        ];
    }

    /**
     * Verify a signed inbound request. Returns null on success, or a short
     * machine-readable failure reason otherwise (never echoed verbatim to
     * the caller — used only for internal logging).
     *
     * @param  array<string, mixed>  $payload
     */
    public static function verify(
        array $payload,
        ?string $timestamp,
        ?string $nonce,
        ?string $signatureHeader,
        ?string $secret = null,
    ): ?string {
        $secret ??= (string) config('security.hmac.secret', '');

        if ($secret === '') {
            return 'hmac_not_configured';
        }

        if (! $timestamp || ! ctype_digit($timestamp)) {
            return 'missing_timestamp';
        }

        if (! $nonce || ! preg_match('/^[a-zA-Z0-9]{16,64}$/', $nonce)) {
            return 'missing_nonce';
        }

        if (! $signatureHeader || ! str_starts_with($signatureHeader, 'sha256=')) {
            return 'missing_signature';
        }

        $maxSkew = (int) config('security.hmac.max_skew_seconds', 300);
        $skew = abs(now()->getTimestamp() - (int) $timestamp);
        if ($skew > $maxSkew) {
            return 'stale_timestamp';
        }

        $expected = self::sign($timestamp, $nonce, self::canonicalBody($payload), $secret);
        $provided = substr($signatureHeader, 7);

        if (! hash_equals($expected, $provided)) {
            return 'signature_mismatch';
        }

        return null;
    }

    /**
     * Atomically claims a (nonce, timestamp) pair so the exact same signed
     * request cannot be replayed within the nonce TTL window. Must only be
     * called after `verify()` has already returned null (i.e. the signature
     * itself checked out). Returns false if the pair was already seen.
     */
    public static function consumeNonce(string $nonce, string $timestamp, string $scope = 'default'): bool
    {
        $ttl = (int) config('security.hmac.nonce_ttl_seconds', 600);
        $key = "hmac-nonce:{$scope}:{$timestamp}:{$nonce}";

        return Cache::add($key, true, $ttl);
    }

    private static function sign(string $timestamp, string $nonce, string $body, string $secret): string
    {
        return hash_hmac('sha256', $timestamp.'.'.$nonce.'.'.$body, $secret);
    }

    /**
     * Canonical, order-stable JSON encoding so the signer and verifier
     * always hash byte-identical bodies even if array key order differs.
     *
     * @param  array<string, mixed>  $payload
     */
    private static function canonicalBody(array $payload): string
    {
        self::sortRecursive($payload);

        return json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
    }

    private static function sortRecursive(array &$payload): void
    {
        ksort($payload);

        foreach ($payload as &$value) {
            if (is_array($value)) {
                self::sortRecursive($value);
            }
        }
    }
}
