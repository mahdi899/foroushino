<?php

namespace App\Support;

/**
 * AES-256-GCM authenticated encryption for the request/response body of the
 * Telegram "host" bridge (external PHP app on cPanel <-> this Laravel app).
 * Rides on top of (never instead of) the HMAC signature + proxy-origin gate
 * already used elsewhere for server-to-server calls — this adds
 * confidentiality on top of authenticity/integrity.
 *
 * Wire format (base64 of the concatenation): iv(12 bytes) . tag(16 bytes) . ciphertext
 */
final class AesGcmCipher
{
    private const CIPHER = 'aes-256-gcm';

    private const IV_LENGTH = 12;

    private const TAG_LENGTH = 16;

    public static function encrypt(string $plaintext, string $base64Key): string
    {
        $key = self::decodeKey($base64Key);
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LENGTH,
        );

        if ($ciphertext === false) {
            throw new \RuntimeException('AES-GCM encryption failed.');
        }

        return base64_encode($iv.$tag.$ciphertext);
    }

    public static function decrypt(string $payload, string $base64Key): ?string
    {
        $key = self::decodeKey($base64Key);
        $raw = base64_decode($payload, true);

        if ($raw === false || strlen($raw) < self::IV_LENGTH + self::TAG_LENGTH) {
            return null;
        }

        $iv = substr($raw, 0, self::IV_LENGTH);
        $tag = substr($raw, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($raw, self::IV_LENGTH + self::TAG_LENGTH);

        $plaintext = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
        );

        return $plaintext === false ? null : $plaintext;
    }

    public static function generateKey(): string
    {
        return base64_encode(random_bytes(32));
    }

    private static function decodeKey(string $base64Key): string
    {
        $key = base64_decode($base64Key, true);

        if ($key === false || strlen($key) !== 32) {
            throw new \RuntimeException('Invalid AES-256-GCM key — must be 32 raw bytes, base64-encoded.');
        }

        return $key;
    }
}
