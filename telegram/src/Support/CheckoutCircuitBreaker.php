<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * Separate circuit breaker for checkout live calls — higher threshold and
 * shorter cooldown than the general Iran link so a background sync blip
 * does not block payment flows.
 */
final class CheckoutCircuitBreaker
{
    private const OPEN_AFTER_FAILURES = 8;

    private const COOLDOWN_SECONDS = 5;

    private const RENOTIFY_AFTER_SECONDS = 600;

    private readonly string $file;

    public function __construct(?string $storageDir = null)
    {
        $dir = $storageDir ?? (dirname(__DIR__, 2).'/storage');
        $this->file = rtrim($dir, '/').'/iran-checkout-circuit-state.json';
    }

    public function isOpen(): bool
    {
        $state = $this->read();
        if ((int) ($state['consecutive_failures'] ?? 0) < self::OPEN_AFTER_FAILURES) {
            return false;
        }

        return (time() - (int) ($state['last_failure_at'] ?? 0)) < self::COOLDOWN_SECONDS;
    }

    /** @return array{shouldNotify: bool, wasAlreadyDown: bool} */
    public function recordFailure(): array
    {
        return $this->withLock(function (array $state, callable $save): array {
            $wasAlreadyDown = (int) ($state['consecutive_failures'] ?? 0) >= self::OPEN_AFTER_FAILURES;
            $failures = (int) ($state['consecutive_failures'] ?? 0) + 1;
            $now = time();

            $shouldNotify = false;
            if (! $wasAlreadyDown && $failures >= self::OPEN_AFTER_FAILURES) {
                $shouldNotify = true;
            } elseif ($wasAlreadyDown && ($now - (int) ($state['notified_at'] ?? 0)) >= self::RENOTIFY_AFTER_SECONDS) {
                $shouldNotify = true;
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

    /** @return array{shouldNotify: bool, wasAlreadyDown: bool} */
    public function peekOpenNotification(): array
    {
        return $this->withLock(function (array $state, callable $save): array {
            $now = time();
            $shouldNotify = ($now - (int) ($state['notified_at'] ?? 0)) >= self::RENOTIFY_AFTER_SECONDS;

            if ($shouldNotify) {
                $state['notified_at'] = $now;
                $save($state);
            }

            return ['shouldNotify' => $shouldNotify, 'wasAlreadyDown' => true];
        });
    }

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
