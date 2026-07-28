<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Http\SyncClient;

/**
 * Optional host→Iran account pull. Not wired into webhook.php (local-first:
 * Iran push maintains accounts_cache). Kept for diagnose/cron tools that
 * explicitly want a reconcile.
 */
final class HostBackgroundSync
{
    public function __construct(
        private readonly SyncCache $cache,
        private readonly SyncClient $sync,
        private readonly AccountCache $accounts,
    ) {}

    /** Account pull only — catalog refresh stays on cron/pull-sync (not webhook). */
    public function refreshForUser(int $telegramUserId): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        try {
            (new AccountSyncCoordinator($this->accounts, $this->sync))->ensureFresh($telegramUserId);
        } catch (\Throwable $e) {
            error_log('[telegram-host] bg account: '.$e->getMessage());
        }
    }
}
