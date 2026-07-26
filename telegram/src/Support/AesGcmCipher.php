<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * Mirrors backend/app/Support/AesGcmCipher.php exactly — must stay in sync.
 * Wire format: base64(flag[1] . iv[12] . tag[16] . ciphertext).
 *
 * `flag` is 0x01 when the plaintext was gzip-deflated before encryption
 * (used for large payloads like account snapshots, which otherwise hit a
 * hard ~8KB request-size wall on this host's web server/WAF) and 0x00
 * otherwise. Decrypt stays backward compatible with the old (unflagged,
 * always-plain) wire format; ambiguous leading bytes fall back to legacy layout.
 */
final class AesGcmCipher
{
    private const CIPHER = 'aes-256-gcm';

    private const IV_LENGTH = 12;

    private const TAG_LENGTH = 16;

    private const FLAG_PLAIN = "\x00";

    private const FLAG_DEFLATED = "\x01";

    private const COMPRESS_THRESHOLD_BYTES = 512;

    public static function encrypt(string $plaintext, string $base64Key): string
    {
        $key = self::decodeKey($base64Key);
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';

        $flag = self::FLAG_PLAIN;
        $body = $plaintext;
        if (strlen($plaintext) > self::COMPRESS_THRESHOLD_BYTES) {
            $deflated = gzdeflate($plaintext, 6);
            if ($deflated !== false) {
                $flag = self::FLAG_DEFLATED;
                $body = $deflated;
            }
        }

        $ciphertext = openssl_encrypt($body, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv, $tag, '', self::TAG_LENGTH);

        if ($ciphertext === false) {
            throw new \RuntimeException('AES-GCM encryption failed.');
        }

        return base64_encode($flag.$iv.$tag.$ciphertext);
    }

    public static function decrypt(string $payload, string $base64Key): ?string
    {
        $key = self::decodeKey($base64Key);
        $raw = base64_decode($payload, true);

        if ($raw === false) {
            return null;
        }

        $minLegacyLength = self::IV_LENGTH + self::TAG_LENGTH;
        if (strlen($raw) < $minLegacyLength) {
            return null;
        }

        $looksFlagged = strlen($raw) >= 1 + $minLegacyLength
            && ($raw[0] === self::FLAG_PLAIN || $raw[0] === self::FLAG_DEFLATED);

        if ($looksFlagged) {
            $decoded = self::decryptRaw($key, $raw, 1, $raw[0]);
            if ($decoded !== null) {
                return $decoded;
            }
        }

        return self::decryptRaw($key, $raw, 0, self::FLAG_PLAIN);
    }

    private static function decryptRaw(string $key, string $raw, int $offset, string $flag): ?string
    {
        if (strlen($raw) < $offset + self::IV_LENGTH + self::TAG_LENGTH) {
            return null;
        }

        $iv = substr($raw, $offset, self::IV_LENGTH);
        $tag = substr($raw, $offset + self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($raw, $offset + self::IV_LENGTH + self::TAG_LENGTH);

        $plaintext = openssl_decrypt($ciphertext, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv, $tag);

        if ($plaintext === false) {
            return null;
        }

        if ($flag === self::FLAG_DEFLATED) {
            $inflated = @gzinflate($plaintext);

            return $inflated === false ? null : $inflated;
        }

        return $plaintext;
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
