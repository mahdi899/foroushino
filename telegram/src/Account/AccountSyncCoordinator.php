<?php

declare(strict_types=1);

namespace TelegramHost\Account;

use TelegramHost\Http\SyncClient;

/**
 * Pulls account identity/snapshot from Iran only when the local user row is
 * missing or incomplete. Day-to-day user cache is maintained via push_account.
 */
final class AccountSyncCoordinator
{
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

        $ghost = $this->accounts->needsIranReconcile($telegramUserId);
        $throttleOk = $this->accounts->secondsSinceUpdate($telegramUserId) >= self::RETRY_INTERVAL_UNVERIFIED_SECONDS;
        $shouldReconcile = $ghost && ($force || $throttleOk);

        if (! $force && ! $shouldReconcile) {
            if ($this->accounts->isVerified($telegramUserId)) {
                if ($this->accounts->hasRenderableProfile($telegramUserId) && ! $ghost) {
                    return true;
                }
            } elseif (! $this->accounts->shouldAttemptIranPull(
                $telegramUserId,
                PHP_INT_MAX,
                self::RETRY_INTERVAL_UNVERIFIED_SECONDS,
            )) {
                return false;
            }
        }

        try {
            $response = $this->sync->call('account/fetch', $this->accountFetchPayload($telegramUserId));
            if (! empty($response['found']) && is_array($response['account'] ?? null)) {
                $account = $response['account'];
                $id = (int) ($account['telegram_user_id'] ?? $telegramUserId);
                $this->accounts->store($id, $account);
            } elseif ($shouldReconcile || $force) {
                $this->reconcileLocalRegistration($telegramUserId);
            }

            if ($this->accounts->needsIranReconcile($telegramUserId)
                || ! $this->accounts->hasRenderableProfile($telegramUserId)) {
                $this->reconcileLocalRegistration($telegramUserId);
                $this->refetchAccount($telegramUserId);
            }

            if (! $force) {
                $this->accounts->recordPullAttempt($telegramUserId);
            }

            return $this->accounts->isVerified($telegramUserId);
        } catch (\Throwable $e) {
            error_log('[telegram-host] account sync: '.$e->getMessage());
            if ($shouldReconcile || $force) {
                $this->reconcileLocalRegistration($telegramUserId);
                $this->refetchAccount($telegramUserId);
            }
            if (! $force) {
                $this->accounts->recordPullAttempt($telegramUserId);
            }

            return $this->accounts->isVerified($telegramUserId);
        }
    }

    private function refetchAccount(int $telegramUserId): void
    {
        try {
            $response = $this->sync->call('account/fetch', $this->accountFetchPayload($telegramUserId));
            if (! empty($response['found']) && is_array($response['account'] ?? null)) {
                $id = (int) ($response['account']['telegram_user_id'] ?? $telegramUserId);
                $this->accounts->store($id, $response['account']);
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] account refetch: '.$e->getMessage());
        }
    }

    /** @return array<string, mixed> */
    private function accountFetchPayload(int $telegramUserId): array
    {
        $payload = [
            'telegram_user_id' => $telegramUserId,
            'include_snapshot' => true,
        ];

        $row = $this->accounts->get($telegramUserId);
        $mobile = is_array($row) ? trim((string) ($row['mobile'] ?? '')) : '';
        if ($mobile === '') {
            $pending = $this->accounts->pendingRegistration($telegramUserId);
            $mobile = is_array($pending) ? trim((string) ($pending['mobile'] ?? '')) : '';
        }
        if ($mobile !== '') {
            $payload['mobile'] = $mobile;
        }

        return $payload;
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
            $response = $this->sync->call('registration/upsert', [
                'telegram_user_id' => $telegramUserId,
                'phone' => $pending['mobile'],
                'display_name' => $pending['display_name'],
                'contact_user_id' => $telegramUserId,
            ], 12, allowRetry: true);

            if (! empty($response['ok']) && is_array($response['account'] ?? null)) {
                $this->accounts->store($telegramUserId, $response['account']);

                return;
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration upsert reconcile: '.$e->getMessage());
        }

        try {
            $this->sync->call('registration/contact', [
                'telegram_user_id' => $telegramUserId,
                'phone' => $pending['mobile'],
                'contact_user_id' => $telegramUserId,
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
