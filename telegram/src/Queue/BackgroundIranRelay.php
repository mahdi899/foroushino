<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Support\IranCircuitBreaker;

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
                $result = $this->live->processUpdate($item['update'], 8, true);
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

    /** Skip relay when the shared circuit is open — no sync-meta probe (saves a round-trip per webhook). */
    public function iranReachable(): bool
    {
        return ! (new IranCircuitBreaker)->isOpen();
    }
}
