<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * Mirrors backend/app/Support/HmacSigner.php wire format exactly:
 *   X-Timestamp: <unix seconds>
 *   X-Nonce:     <random 32-hex>
 *   X-Signature: sha256=<hex hmac of "{timestamp}.{nonce}.{canonicalJsonBody}">
 *
 * The body signed/verified is always `{"body": "<...>"}` where `<...>` is the
 * (still AES-encrypted) request payload — a single-key object, so canonical
 * key ordering never matters.
 */
final class HmacClient
{
    /** @return array<string, string> */
    public static function headersFor(string $encryptedBody, string $secret): array
    {
        $timestamp = (string) time();
        $nonce = bin2hex(random_bytes(16));
        $canonical = self::canonicalBody($encryptedBody);

        return [
            'X-Timestamp' => $timestamp,
            'X-Nonce' => $nonce,
            'X-Signature' => 'sha256='.self::sign($timestamp, $nonce, $canonical, $secret),
        ];
    }

    private static function sign(string $timestamp, string $nonce, string $body, string $secret): string
    {
        return hash_hmac('sha256', $timestamp.'.'.$nonce.'.'.$body, $secret);
    }

    private static function canonicalBody(string $encryptedBody): string
    {
        return json_encode(['body' => $encryptedBody], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
    }
}
