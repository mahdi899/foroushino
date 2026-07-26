<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;

/** Tries to drain queued updates to Iran after the user already got a response. */
final class BackgroundIranRelay
{
    public function __construct(
        private readonly IranUpdateQueue $queue,
        private readonly LiveClient $live,
        private readonly SyncClient $sync,
        private readonly int $maxPerRun = 2,
    ) {}

    public function drain(): void
    {
        if (! $this->iranReachable()) {
            return;
        }

        foreach ($this->queue->popBatch($this->maxPerRun) as $item) {
            $id = $item['id'];
            try {
                $result = $this->live->processUpdate($item['update']);
                if (! empty($result['ok']) || ! isset($result['ok'])) {
                    $this->queue->delete($id);

                    continue;
                }
                $this->queue->markFailed($id, (string) ($result['message'] ?? 'relay_failed'));
            } catch (\Throwable $e) {
                $this->queue->markFailed($id, $e->getMessage());
            }
        }

        $this->queue->pruneOld();
    }

    /** Lightweight probe — does not block UI (called after response). */
    public function iranReachable(): bool
    {
        try {
            $this->sync->call('sync-meta', []);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
