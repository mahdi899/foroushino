<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Http\LiveClient;
use TelegramHost\Support\IranCircuitBreaker;

/** Drains pending CRM ticket syncs after the webhook response. */
final class BackgroundTicketSync
{
    public function __construct(
        private readonly PendingTicketSync $queue,
        private readonly LiveClient $live,
        private readonly int $maxPerRun = 5,
    ) {}

    public function drain(): void
    {
        if ((new IranCircuitBreaker)->isOpen()) {
            return;
        }

        foreach ($this->queue->popBatch($this->maxPerRun) as $item) {
            $id = $item['id'];
            try {
                $result = $this->live->supportSyncTicket($item['payload']);
                if (! empty($result['ok'])) {
                    $this->queue->delete($id);

                    continue;
                }
                $this->queue->markFailed($id, (string) ($result['message'] ?? 'sync_failed'));
            } catch (\Throwable $e) {
                $this->queue->markFailed($id, $e->getMessage());
            }
        }

        $this->queue->pruneOld();
    }
}
