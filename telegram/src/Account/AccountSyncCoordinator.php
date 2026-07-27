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

        // A local-only registration (Iran was unreachable at contact/name
        // time) never gets picked up by the normal verified/unverified
        // throttle above — it's already "verified" locally with a fresh
        // snapshot-less row. Bypass the throttle (rate-limited on its own,
        // via secondsSinceUpdate) so it actually gets reconciled once Iran
        // is reachable again, instead of staying a host-only ghost forever.
        $needsReconcile = $this->accounts->needsIranReconcile($telegramUserId)
            && $this->accounts->secondsSinceUpdate($telegramUserId) >= self::RETRY_INTERVAL_UNVERIFIED_SECONDS;

        if (! $force && ! $needsReconcile && ! $this->accounts->shouldAttemptIranPull(
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
                if ($needsReconcile) {
                    $this->reconcileLocalRegistration($telegramUserId);
                }
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

    /**
     * Replays the registration Iran never received (contact + name) for a
     * user who was finished entirely on the host while Iran was down. This
     * is what actually turns a host-only "ghost" account into a real Iran
     * user — a plain account/fetch alone can never find one, since Iran
     * never had a record to find.
     */
    private function reconcileLocalRegistration(int $telegramUserId): void
    {
        $pending = $this->accounts->pendingRegistration($telegramUserId);
        if ($pending === null) {
            return;
        }

        try {
            $this->sync->call('registration/contact', [
                'telegram_user_id' => $telegramUserId,
                'phone' => $pending['mobile'],
            ]);
            $response = $this->sync->call('registration/name', [
                'telegram_user_id' => $telegramUserId,
                'name' => $pending['display_name'],
            ]);
            if (is_array($response['account'] ?? null)) {
                $this->accounts->store($telegramUserId, $response['account']);
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] local registration reconcile: '.$e->getMessage());
        }
    }
}
