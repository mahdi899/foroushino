<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\HybridAccountCache;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Services\HostSupportService;

/** Shared post-ACK drain used by webhook.php (limited) and cron/drain.php (budgeted). */
final class BackgroundDrainCoordinator
{
    public function __construct(
        private readonly PendingRegistrationSync $registrationQueue,
        private readonly PendingSupportForward $supportForwardQueue,
        private readonly IranUpdateQueue $iranQueue,
        private readonly PendingTicketSync $ticketQueue,
        private readonly PendingMembershipSync $membershipQueue,
        private readonly SyncClient $sync,
        private readonly LiveClient $liveClient,
        private readonly AccountCache $accounts,
        private readonly HostSupportService $support,
        private readonly int $iranRelayPerRun,
        private readonly ?PendingAccountRefresh $accountRefreshQueue = null,
        private readonly ?HybridAccountCache $hybridCache = null,
        private readonly ?PendingCheckoutRevoke $checkoutRevokeQueue = null,
    ) {}

    /** @return int Total items processed across all queues. */
    public function drainOnce(int $maxPerQueue): int
    {
        $maxPerQueue = max(0, $maxPerQueue);
        if ($maxPerQueue === 0) {
            return 0;
        }

        $processed = 0;

        try {
            $before = $this->registrationQueue->countPending();
            (new BackgroundRegistrationSync($this->registrationQueue, $this->sync, $this->accounts, $maxPerQueue))->drain();
            $processed += max(0, $before - $this->registrationQueue->countPending());
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration sync: '.$e->getMessage());
        }

        try {
            $before = $this->supportForwardQueue->countPending();
            (new BackgroundSupportForward($this->supportForwardQueue, $this->support, $maxPerQueue))->drain();
            $processed += max(0, $before - $this->supportForwardQueue->countPending());
        } catch (\Throwable $e) {
            error_log('[telegram-host] support forward: '.$e->getMessage());
        }

        try {
            $before = $this->iranQueue->countPending();
            (new BackgroundIranRelay($this->iranQueue, $this->liveClient, $this->sync, $this->iranRelayPerRun))->drain();
            $processed += max(0, $before - $this->iranQueue->countPending());
        } catch (\Throwable $e) {
            error_log('[telegram-host] iran relay: '.$e->getMessage());
        }

        try {
            $before = $this->ticketQueue->countPending();
            (new BackgroundTicketSync($this->ticketQueue, $this->liveClient, $maxPerQueue))->drain();
            $processed += max(0, $before - $this->ticketQueue->countPending());
        } catch (\Throwable $e) {
            error_log('[telegram-host] ticket sync: '.$e->getMessage());
        }

        try {
            $before = $this->membershipQueue->countPending();
            (new BackgroundMembershipSync($this->membershipQueue, $this->liveClient, $maxPerQueue))->drain();
            $processed += max(0, $before - $this->membershipQueue->countPending());
        } catch (\Throwable $e) {
            error_log('[telegram-host] membership sync: '.$e->getMessage());
        }

        if ($this->accountRefreshQueue !== null && $this->hybridCache !== null) {
            try {
                $before = $this->accountRefreshQueue->countPending();
                (new BackgroundAccountRefresh(
                    $this->accountRefreshQueue,
                    $this->sync,
                    $this->accounts,
                    $this->hybridCache,
                    $maxPerQueue,
                ))->drain();
                $processed += max(0, $before - $this->accountRefreshQueue->countPending());
            } catch (\Throwable $e) {
                error_log('[telegram-host] account refresh: '.$e->getMessage());
            }
        }

        if ($this->checkoutRevokeQueue !== null) {
            try {
                $before = $this->checkoutRevokeQueue->countPending();
                (new BackgroundCheckoutRevoke($this->checkoutRevokeQueue, $this->liveClient, $maxPerQueue))->drain();
                $processed += max(0, $before - $this->checkoutRevokeQueue->countPending());
            } catch (\Throwable $e) {
                error_log('[telegram-host] checkout revoke: '.$e->getMessage());
            }
        }

        return $processed;
    }

    public function drainWithBudget(int $maxPerQueuePerRound, float $budgetSeconds): int
    {
        $deadline = microtime(true) + max(1.0, $budgetSeconds);
        $total = 0;

        while (microtime(true) < $deadline) {
            $processed = $this->drainOnce($maxPerQueuePerRound);
            $total += $processed;
            if ($processed === 0) {
                break;
            }
        }

        return $total;
    }

    /** @return array<string, int> */
    public function queueDepths(): array
    {
        return [
            'pending_registration_sync' => $this->registrationQueue->countPending(),
            'pending_support_forward' => $this->supportForwardQueue->countPending(),
            'pending_iran_updates' => $this->iranQueue->countPending(),
            'pending_ticket_sync' => $this->ticketQueue->countPending(),
            'pending_membership_sync' => $this->membershipQueue->countPending(),
            'pending_account_refresh' => $this->accountRefreshQueue?->countPending() ?? 0,
            'pending_checkout_revoke' => $this->checkoutRevokeQueue?->countPending() ?? 0,
        ];
    }
}
