<?php

namespace App\Services;

use App\Models\Setting;
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

    public const KEY_PAYLOAD = 'host_push_pending_payload';

    /** Consecutive failures before opening the circuit. */
    private const FAILURE_THRESHOLD = 3;

    /** How long to skip real requests once the circuit is open. */
    private const COOLDOWN_SECONDS = 90;

    private const CACHE_FAILURES = 'telegram_host_push_failures';

    private const CACHE_OPEN_UNTIL = 'telegram_host_push_open_until';

    public function __construct(private readonly SettingService $settings) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function markPending(string $action, array $payload = []): void
    {
        $group = $this->settings->group(self::GROUP);
        $group[self::KEY] = $action;
        if ($payload !== []) {
            $group[self::KEY_PAYLOAD] = $payload;
        }
        $this->settings->updateGroup(self::GROUP, $group);
    }

    public function clear(): void
    {
        // SettingService::updateGroup only upserts keys present in the payload —
        // unsetting a key in PHP does not delete the DB row. Delete explicitly.
        Setting::query()
            ->where('group', self::GROUP)
            ->whereIn('key', [self::KEY, self::KEY_PAYLOAD])
            ->delete();
    }

    /** @return array<string, mixed>|null */
    public function pendingPayload(): ?array
    {
        $value = $this->settings->group(self::GROUP)[self::KEY_PAYLOAD] ?? null;

        return is_array($value) ? $value : null;
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
