<?php

declare(strict_types=1);

namespace TelegramHost\Account;

use TelegramHost\Http\SyncClient;

/**
 * Pulls account identity/snapshot from Iran. Safe from webhook (fast account/fetch only).
 */
final class AccountSyncCoordinator
{
    private const REFRESH_INTERVAL_VERIFIED_SECONDS = 180;

    /** Avoid hammering Iran when user is unknown and host has no cache row yet. */
    private const RETRY_INTERVAL_UNVERIFIED_SECONDS = 45;

    public function __construct(
        private readonly AccountCache $accounts,
        private readonly SyncClient $sync,
    ) {}

    public function ensureFresh(int $telegramUserId, bool $force = false): bool
    {
        if ($telegramUserId <= 0) {
            return false;
        }

        if (! $force && ! $this->accounts->shouldAttemptIranPull(
            $telegramUserId,
            self::REFRESH_INTERVAL_VERIFIED_SECONDS,
            self::RETRY_INTERVAL_UNVERIFIED_SECONDS,
        )) {
            return $this->accounts->isVerified($telegramUserId);
        }

        try {
            $response = $this->sync->call('account/fetch', [
                'telegram_user_id' => $telegramUserId,
                'include_snapshot' => true,
            ]);
            if (empty($response['found']) || ! is_array($response['account'] ?? null)) {
                if (! $force) {
                    $this->accounts->recordPullAttempt($telegramUserId);
                }

                return $this->accounts->isVerified($telegramUserId);
            }

            $account = $response['account'];
            $id = (int) ($account['telegram_user_id'] ?? $telegramUserId);
            $this->accounts->store($id, $account);

            return $this->accounts->isVerified($telegramUserId);
        } catch (\Throwable $e) {
            error_log('[telegram-host] account sync: '.$e->getMessage());
            if (! $force) {
                $this->accounts->recordPullAttempt($telegramUserId);
            }

            return $this->accounts->isVerified($telegramUserId);
        }
    }
}
