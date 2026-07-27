<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Support\AesGcmCipher;
use TelegramHost\Support\HmacClient;
use TelegramHost\Support\IranCircuitBreaker;
use TelegramHost\Support\IranSyncFailureException;

/**
 * Talks to the main Laravel server's `telegram-host` sync API.
 * Every call: encrypt body (AES-256-GCM) -> sign (HMAC-SHA256) -> POST.
 * Every response: `{"payload": "<encrypted>"}` -> decrypt -> decode JSON.
 *
 * Wrapped with a circuit breaker: once Iran is confirmed down, further calls
 * fail instantly instead of each burning a fresh multi-second timeout — this
 * is what previously made every webhook hang and the outage alert repeat for
 * every single update while Iran was unreachable.
 */
final class SyncClient
{
    private readonly IranCircuitBreaker $breaker;

    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config)
    {
        $this->breaker = new IranCircuitBreaker();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    /**
     * Default is 8s (was 4s) — Iran normally answers in well under 1s, but
     * occasional GC/load spikes pushed real responses just past a 4s cutoff,
     * making healthy-but-slightly-slow calls look like outages.
     */
    public function call(string $path, array $payload = [], int $timeoutSeconds = 8): array
    {
        if ($this->breaker->isOpen()) {
            // Fail fast — no network attempt, and critically no recordFailure()
            // here: that used to refresh last_failure_at on every single skip,
            // which meant the 20s cooldown never actually elapsed while users
            // kept messaging the bot (see IranSyncFailureException docblock).
            $outcome = $this->breaker->peekOpenNotification();

            throw new IranSyncFailureException(
                'Sync request skipped: Iran main server is currently marked unreachable (circuit open).',
                shouldNotify: $outcome['shouldNotify'],
                wasAlreadyDown: true,
                circuitOpenSkip: true,
            );
        }

        try {
            $result = $this->doCall($path, $payload, $timeoutSeconds);
            $this->breaker->recordSuccess();

            return $result;
        } catch (\Throwable $e) {
            // One quick retry for transient network blips (connect/timeout,
            // TLS reset, DNS hiccup) before giving up — this is exactly the
            // class of failure users saw as "checkout unavailable" for a
            // momentary Iran/host connectivity dip that a single retry a
            // couple hundred ms later would have sailed through. Real
            // outages (Iran genuinely down) still fail fast on the retry and
            // open the circuit breaker as before.
            if ($this->isTransientNetworkError($e)) {
                try {
                    usleep(300_000);
                    $result = $this->doCall($path, $payload, $timeoutSeconds);
                    $this->breaker->recordSuccess();

                    return $result;
                } catch (\Throwable $retryError) {
                    $e = $retryError;
                }
            }

            $outcome = $this->breaker->recordFailure();

            throw new IranSyncFailureException(
                $e->getMessage(),
                shouldNotify: $outcome['shouldNotify'],
                wasAlreadyDown: $outcome['wasAlreadyDown'],
                circuitOpenSkip: false,
                previous: $e,
            );
        }
    }

    private function isTransientNetworkError(\Throwable $e): bool
    {
        $message = strtolower($e->getMessage());

        return str_contains($message, 'timed out')
            || str_contains($message, 'timeout')
            || str_contains($message, 'could not resolve')
            || str_contains($message, 'connection refused')
            || str_contains($message, 'connection reset')
            || str_contains($message, 'ssl')
            || str_contains($message, 'curl error');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function doCall(string $path, array $payload, int $timeoutSeconds): array
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
            CURLOPT_CONNECTTIMEOUT => min(4, $timeoutSeconds),
            CURLOPT_TIMEOUT => max(6, $timeoutSeconds),
            CURLOPT_ENCODING => '',
            CURLOPT_TCP_KEEPALIVE => 1,
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
