<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * File-based circuit breaker for the host → Iran sync link.
 *
 * Problem this fixes: every failed call to Iran (registration, payment,
 * support, admin delegate, catalog/account background sync) used to hit the
 * full network timeout (8–15s) AND fire a fresh "قطع ارتباط با سرور اصلی"
 * alert to the reports group — for *every single* Telegram update, as long
 * as Iran stayed down. With many users messaging the bot, that meant dozens
 * of duplicate alerts per minute and every webhook hanging for seconds.
 *
 * This breaker is shared (via a small JSON file under storage/) by every
 * request/process on the host:
 *  - After a couple of consecutive failures it "opens": further calls fail
 *    instantly (no network wait) until a short cool-down passes, then lets
 *    one probe through (half-open) to test recovery.
 *  - Notifications are throttled: only the first failure that opens the
 *    circuit, and then at most once per re-notify interval while it stays
 *    open, actually trigger an outage alert.
 */
final class IranCircuitBreaker
{
    private const OPEN_AFTER_FAILURES = 2;

    private const COOLDOWN_SECONDS = 20;

    private const RENOTIFY_AFTER_SECONDS = 600; // 10 minutes

    private readonly string $file;

    public function __construct(?string $storageDir = null)
    {
        $dir = $storageDir ?? (dirname(__DIR__, 2).'/storage');
        $this->file = rtrim($dir, '/').'/iran-circuit-state.json';
    }

    /** True when calls to Iran should be skipped (fail fast, no network attempt). */
    public function isOpen(): bool
    {
        $state = $this->read();
        if ((int) ($state['consecutive_failures'] ?? 0) < self::OPEN_AFTER_FAILURES) {
            return false;
        }

        return (time() - (int) ($state['last_failure_at'] ?? 0)) < self::COOLDOWN_SECONDS;
    }

    /**
     * Call after a failed Iran request.
     *
     * @return array{shouldNotify: bool, wasAlreadyDown: bool}
     */
    public function recordFailure(): array
    {
        return $this->withLock(function (array $state, callable $save): array {
            $wasAlreadyDown = (int) ($state['consecutive_failures'] ?? 0) >= self::OPEN_AFTER_FAILURES;
            $failures = (int) ($state['consecutive_failures'] ?? 0) + 1;
            $now = time();

            $shouldNotify = false;
            if (! $wasAlreadyDown && $failures >= self::OPEN_AFTER_FAILURES) {
                $shouldNotify = true; // outage just started
            } elseif ($wasAlreadyDown && ($now - (int) ($state['notified_at'] ?? 0)) >= self::RENOTIFY_AFTER_SECONDS) {
                $shouldNotify = true; // heartbeat re-alert while still down
            }

            $state['consecutive_failures'] = $failures;
            $state['last_failure_at'] = $now;
            if ($shouldNotify) {
                $state['notified_at'] = $now;
            }

            $save($state);

            return ['shouldNotify' => $shouldNotify, 'wasAlreadyDown' => $wasAlreadyDown];
        });
    }

    /** Call after a successful Iran request. Returns true if the link had been marked down. */
    public function recordSuccess(): bool
    {
        return $this->withLock(function (array $state, callable $save): bool {
            $wasDown = (int) ($state['consecutive_failures'] ?? 0) >= self::OPEN_AFTER_FAILURES;
            if (($state['consecutive_failures'] ?? 0) !== 0 || ($state['notified_at'] ?? 0) !== 0) {
                $save(['consecutive_failures' => 0, 'last_failure_at' => 0, 'notified_at' => 0]);
            }

            return $wasDown;
        });
    }

    /** @return array<string, int> */
    private function read(): array
    {
        if (! is_file($this->file)) {
            return [];
        }

        $raw = @file_get_contents($this->file);
        if ($raw === false || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @template T
     * @param  callable(array<string, int>): T  $fn
     * @return T
     */
    private function withLock(callable $fn): mixed
    {
        $dir = dirname($this->file);
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $handle = @fopen($this->file, 'c+');
        if ($handle === false) {
            // Filesystem unavailable — degrade to "always notify, never open"
            // rather than throwing from a monitoring path.
            return $fn(['consecutive_failures' => 0, 'last_failure_at' => 0, 'notified_at' => 0], static function (): void {});
        }

        try {
            flock($handle, LOCK_EX);
            $raw = stream_get_contents($handle);
            $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
            $state = is_array($decoded) ? $decoded : [];

            $newState = null;
            $result = $fn($state, function (array $updated) use (&$newState): void {
                $newState = $updated;
            });

            if ($newState !== null) {
                rewind($handle);
                ftruncate($handle, 0);
                fwrite($handle, (string) json_encode($newState));
                fflush($handle);
            }

            return $result;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
