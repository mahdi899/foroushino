<?php

declare(strict_types=1);

namespace TelegramHost\Account;

use TelegramHost\Http\SyncClient;

/**
 * Pulls fresh account snapshot from Iran when local copy is missing or stale.
 */
final class AccountSyncCoordinator
{
    private const REFRESH_INTERVAL_SECONDS = 180;

    public function __construct(
        private readonly AccountCache $accounts,
        private readonly SyncClient $sync,
    ) {}

    public function ensureFresh(int $telegramUserId): void
    {
        if (! $this->accounts->shouldRefreshSnapshot($telegramUserId, self::REFRESH_INTERVAL_SECONDS)) {
            return;
        }

        try {
            $response = $this->sync->call('account/fetch', [
                'telegram_user_id' => $telegramUserId,
                'include_snapshot' => true,
            ]);
            if (empty($response['found']) || ! is_array($response['account'] ?? null)) {
                return;
            }

            $account = $response['account'];
            $id = (int) ($account['telegram_user_id'] ?? $telegramUserId);
            $this->accounts->store($id, $account);
        } catch (\Throwable $e) {
            error_log('[telegram-host] account sync: '.$e->getMessage());
        }
    }
}
