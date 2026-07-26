<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Tracks failed Iran → external-host push so the scheduler can retry, and
 * runs a short-lived circuit breaker so a dead/blocked host doesn't make
 * every registration, order, or notification hang for the full HTTP timeout.
 */
class TelegramHostPushState
{
    public const GROUP = 'telegram';

    public const KEY = 'host_push_pending_action';

    /** Consecutive failures before opening the circuit. */
    private const FAILURE_THRESHOLD = 3;

    /** How long to skip real requests once the circuit is open. */
    private const COOLDOWN_SECONDS = 90;

    private const CACHE_FAILURES = 'telegram_host_push_failures';

    private const CACHE_OPEN_UNTIL = 'telegram_host_push_open_until';

    public function __construct(private readonly SettingService $settings) {}

    public function markPending(string $action): void
    {
        $group = $this->settings->group(self::GROUP);
        $group[self::KEY] = $action;
        $this->settings->updateGroup(self::GROUP, $group);
    }

    public function clear(): void
    {
        $group = $this->settings->group(self::GROUP);
        unset($group[self::KEY]);
        $this->settings->updateGroup(self::GROUP, $group);
    }

    public function pendingAction(): ?string
    {
        $value = $this->settings->group(self::GROUP)[self::KEY] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * True when the host has failed enough recent attempts that we should
     * skip the network call entirely instead of blocking for the full timeout.
     */
    public function isCircuitOpen(): bool
    {
        $openUntil = (int) Cache::get(self::CACHE_OPEN_UNTIL, 0);

        return $openUntil > time();
    }

    public function secondsUntilRetry(): int
    {
        $openUntil = (int) Cache::get(self::CACHE_OPEN_UNTIL, 0);

        return max(0, $openUntil - time());
    }

    public function recordFailure(): void
    {
        $failures = (int) Cache::get(self::CACHE_FAILURES, 0) + 1;
        Cache::put(self::CACHE_FAILURES, $failures, now()->addMinutes(10));

        if ($failures >= self::FAILURE_THRESHOLD) {
            Cache::put(self::CACHE_OPEN_UNTIL, time() + self::COOLDOWN_SECONDS, now()->addMinutes(10));
        }
    }

    public function recordSuccess(): void
    {
        Cache::forget(self::CACHE_FAILURES);
        Cache::forget(self::CACHE_OPEN_UNTIL);
    }
}
