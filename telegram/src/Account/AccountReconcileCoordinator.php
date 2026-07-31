<?php

declare(strict_types=1);

namespace TelegramHost\Account;

use TelegramHost\Http\SyncClient;

/**
 * Cron safety net: pull fresh account snapshots from Iran (KYC level, purchases,
 * owned presents) without wiping catalog or other users' rows.
 */
final class AccountReconcileCoordinator
{
    public function __construct(
        private readonly AccountCache $accounts,
        private readonly SyncClient $sync,
    ) {}

    /**
     * @return array{candidates: int, refreshed: int, failed: int}
     */
    public function reconcileBatch(int $limit = 35): array
    {
        $limit = max(1, min(200, $limit));
        $ids = $this->accounts->telegramUserIdsForReconcile($limit);
        $coordinator = new AccountSyncCoordinator($this->accounts, $this->sync);

        $refreshed = 0;
        $failed = 0;

        foreach ($ids as $telegramUserId) {
            try {
                if ($coordinator->ensureFresh($telegramUserId, force: true)) {
                    $refreshed++;
                } else {
                    $failed++;
                }
            } catch (\Throwable $e) {
                $failed++;
                error_log('[telegram-host] account reconcile '.$telegramUserId.': '.$e->getMessage());
            }
        }

        return [
            'candidates' => count($ids),
            'refreshed' => $refreshed,
            'failed' => $failed,
        ];
    }
}
