<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Services\HostSupportService;

/** Drains queued reports-group forwards after the webhook response. */
final class BackgroundSupportForward
{
    public function __construct(
        private readonly PendingSupportForward $queue,
        private readonly HostSupportService $support,
        private readonly int $maxPerRun = 5,
    ) {}

    public function drain(): void
    {
        foreach ($this->queue->popBatch($this->maxPerRun) as $item) {
            $id = $item['id'];
            try {
                $this->support->processQueuedForward($item['payload']);
                $this->queue->delete($id);
            } catch (\Throwable $e) {
                $this->queue->markFailed($id, $e->getMessage());
                error_log('[telegram-host] support forward drain: '.$e->getMessage());
            }
        }

        $this->queue->pruneOld();
    }
}
