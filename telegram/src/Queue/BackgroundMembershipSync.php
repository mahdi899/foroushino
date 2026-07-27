<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Http\LiveClient;
use TelegramHost\Support\IranCircuitBreaker;

/** Drains destination membership syncs after the webhook response. */
final class BackgroundMembershipSync
{
    public function __construct(
        private readonly PendingMembershipSync $queue,
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
                $payload = $item['payload'];
                $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
                $items = (array) ($payload['items'] ?? []);
                if ($telegramUserId <= 0 || $items === []) {
                    $this->queue->delete($id);

                    continue;
                }

                $result = $this->live->destinationMembershipSync($telegramUserId, $items);
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
