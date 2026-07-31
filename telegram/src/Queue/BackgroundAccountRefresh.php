<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Account\HybridAccountCache;
use TelegramHost\Http\SyncClient;
use TelegramHost\Support\IranCircuitBreaker;

/** Drains deferred hybrid account refresh after webhook ACK. */
final class BackgroundAccountRefresh
{
    public function __construct(
        private readonly PendingAccountRefresh $queue,
        private readonly SyncClient $sync,
        private readonly AccountCache $accounts,
        private readonly HybridAccountCache $hybrid,
        private readonly int $maxPerRun = 4,
    ) {}

    public function drain(): void
    {
        if ((new IranCircuitBreaker)->isOpen()) {
            return;
        }

        $coordinator = new AccountSyncCoordinator($this->accounts, $this->sync);

        foreach ($this->queue->popBatch($this->maxPerRun) as $item) {
            $id = $item['id'];
            $telegramUserId = $item['telegram_user_id'];
            $scope = $item['scope'];

            if ($telegramUserId <= 0) {
                $this->queue->delete($id);

                continue;
            }

            try {
                $stillNeeded = match ($scope) {
                    'cold' => $this->hybrid->needsColdRefresh($telegramUserId),
                    'full' => true,
                    default => $this->hybrid->needsHotRefresh($telegramUserId),
                };

                if (! $stillNeeded) {
                    $this->queue->delete($id);

                    continue;
                }

                $ok = $coordinator->ensureFresh($telegramUserId, force: $scope === 'full');
                if ($ok || ! $this->hybrid->needsHotRefresh($telegramUserId)) {
                    $this->queue->delete($id);
                } else {
                    $this->queue->markFailed($id, 'refresh_incomplete');
                }
            } catch (\Throwable $e) {
                $this->queue->markFailed($id, $e->getMessage());
                error_log('[telegram-host] account refresh drain: '.$e->getMessage());
            }
        }
    }
}
