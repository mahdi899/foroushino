<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * Verifies inbound push requests from the main Laravel server.
 * Mirrors backend/app/Support/HmacSigner.php verify() wire format.
 */
final class HmacVerifier
{
    private const MAX_SKEW_SECONDS = 300;

    public static function verify(string $encryptedBody, string $timestamp, string $nonce, string $signatureHeader, string $secret): ?string
    {
        if ($secret === '') {
            return 'hmac_not_configured';
        }

        if ($timestamp === '' || ! ctype_digit($timestamp)) {
            return 'missing_timestamp';
        }

        if ($nonce === '' || ! preg_match('/^[a-zA-Z0-9]{16,64}$/', $nonce)) {
            return 'missing_nonce';
        }

        if ($signatureHeader === '' || ! str_starts_with($signatureHeader, 'sha256=')) {
            return 'missing_signature';
        }

        $skew = abs(time() - (int) $timestamp);
        if ($skew > self::MAX_SKEW_SECONDS) {
            return 'stale_timestamp';
        }

        $canonical = json_encode(['body' => $encryptedBody], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
        $expected = hash_hmac('sha256', $timestamp.'.'.$nonce.'.'.$canonical, $secret);
        $provided = substr($signatureHeader, 7);

        if (! hash_equals($expected, $provided)) {
            return 'signature_mismatch';
        }

        return null;
    }
}
