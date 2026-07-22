<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Support\AesGcmCipher;
use TelegramHost\Support\HmacClient;

/**
 * Talks to the main Laravel server's `telegram-host` sync API.
 * Every call: encrypt body (AES-256-GCM) -> sign (HMAC-SHA256) -> POST.
 * Every response: `{"payload": "<encrypted>"}` -> decrypt -> decode JSON.
 */
final class SyncClient
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function call(string $path, array $payload = []): array
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Failed to encode sync payload.');
        }

        $encrypted = AesGcmCipher::encrypt($json, (string) $this->config['aes_key']);
        $headers = HmacClient::headersFor($encrypted, (string) $this->config['hmac_secret']);

        $ch = curl_init(rtrim((string) $this->config['sync_base_url'], '/').'/'.ltrim($path, '/'));
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $encrypted,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => array_merge([
                'Content-Type: text/plain',
                'Authorization: Bearer '.$this->config['hmac_secret'],
                'X-Proxy-Origin: '.($this->config['proxy_origin'] ?? 'Telegram-Host-App'),
            ], array_map(
                static fn (string $k, string $v): string => "{$k}: {$v}",
                array_keys($headers),
                array_values($headers),
            )),
        ]);

        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false) {
            throw new \RuntimeException('Sync request failed: '.$error);
        }

        $decoded = json_decode((string) $body, true);
        if (! is_array($decoded)) {
            throw new \RuntimeException("Sync request returned invalid JSON (HTTP {$status}).");
        }

        if (isset($decoded['payload']) && is_string($decoded['payload'])) {
            $plaintext = AesGcmCipher::decrypt($decoded['payload'], (string) $this->config['aes_key']);
            if ($plaintext === null) {
                throw new \RuntimeException('Failed to decrypt sync response.');
            }
            $result = json_decode($plaintext, true);

            return is_array($result) ? $result : [];
        }

        // Fallback: server responded unencrypted (e.g. host bridge not fully configured yet).
        return $decoded;
    }
}
