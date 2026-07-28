<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Support\HostBridgeConfig;
use TelegramHost\Support\IranCircuitBreaker;
use TelegramHost\Support\IranSyncFailureException;

/**
 * Talks to the main Laravel server's `telegram-host` sync API over HTTPS:
 * Bearer `host_sync_token` + JSON request/response (no AES/HMAC wire format).
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
    public function call(string $path, array $payload = [], int $timeoutSeconds = 8, bool $allowRetry = true): array
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
            // Registration paths pass allowRetry=false so a dead Iran fails
            // into the offline local flow instead of doubling the wait.
            if ($allowRetry && $this->isTransientNetworkError($e)) {
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

        $token = HostBridgeConfig::syncToken($this->config);
        if ($token === '') {
            throw new \RuntimeException('Host sync token is not configured.');
        }

        $ch = curl_init(rtrim((string) $this->config['sync_base_url'], '/').'/'.ltrim($path, '/'));
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_RETURNTRANSFER => true,
            // Allow a bit more connect time on the Iran hop (TLS / WAF) without
            // burning the whole request budget.
            CURLOPT_CONNECTTIMEOUT => max(2, min(5, $timeoutSeconds)),
            CURLOPT_TIMEOUT => max(1, $timeoutSeconds),
            CURLOPT_ENCODING => '',
            CURLOPT_TCP_KEEPALIVE => 1,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer '.$token,
                'X-Proxy-Origin: '.($this->config['proxy_origin'] ?? 'Telegram-Host-App'),
            ],
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

        if ($status >= 400) {
            // Business replies from Iran (validation / not registered / not admin)
            // come back as 4xx + {ok:false}. Treat them as normal responses so we
            // do NOT trip the circuit breaker and kill checkout/admin for everyone.
            if ($status < 500 && array_key_exists('ok', $decoded)) {
                return $decoded;
            }

            $detail = (string) ($decoded['error']['message'] ?? $decoded['message'] ?? "HTTP {$status}");

            throw new \RuntimeException("Sync request failed (HTTP {$status}): {$detail}");
        }

        return $decoded;
    }
}
