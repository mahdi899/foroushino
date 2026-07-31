<?php

declare(strict_types=1);

namespace TelegramHost\Account;

use TelegramHost\Queue\PendingAccountRefresh;

/**
 * Hybrid per-user cache: serve MySQL mirror instantly; refresh only stale
 * hot fields (orders, licenses, identity) or cold fields (family, referral, SAT)
 * in the background after the webhook ACK.
 */
final class HybridAccountCache
{
    public function __construct(
        private readonly AccountCache $accounts,
        private readonly PendingAccountRefresh $refreshQueue,
        /** @var array<string, mixed> */
        private readonly array $config,
    ) {}

    public function hotTtlSeconds(): int
    {
        return max(60, (int) ($this->config['hybrid_cache']['hot_ttl_seconds'] ?? 120));
    }

    public function coldTtlSeconds(): int
    {
        return max(300, (int) ($this->config['hybrid_cache']['cold_ttl_seconds'] ?? 3600));
    }

    public function refreshOnStartEnabled(): bool
    {
        return (bool) ($this->config['hybrid_cache']['refresh_on_start'] ?? true);
    }

    public function needsHotRefresh(int $telegramUserId): bool
    {
        return $this->accounts->needsHotRefresh($telegramUserId, $this->hotTtlSeconds());
    }

    public function needsColdRefresh(int $telegramUserId): bool
    {
        return $this->accounts->needsColdRefresh($telegramUserId, $this->coldTtlSeconds());
    }

    /** Queue a post-ACK Iran pull when hot data may be stale. */
    public function scheduleHotRefresh(int $telegramUserId, string $reason = 'start'): void
    {
        if ($telegramUserId <= 0 || ! $this->refreshOnStartEnabled()) {
            return;
        }

        if (! $this->needsHotRefresh($telegramUserId)) {
            return;
        }

        $this->refreshQueue->enqueue($telegramUserId, 'hot', $reason);
    }

    public function scheduleColdRefresh(int $telegramUserId, string $reason = 'menu'): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        if (! $this->needsColdRefresh($telegramUserId)) {
            return;
        }

        $this->refreshQueue->enqueue($telegramUserId, 'cold', $reason);
    }
}
