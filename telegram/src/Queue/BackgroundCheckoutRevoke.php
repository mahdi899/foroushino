<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Http\LiveClient;
use TelegramHost\Support\IranCircuitBreaker;

/** Drains pending checkout revoke-open calls after the webhook response. */
final class BackgroundCheckoutRevoke
{
    public function __construct(
        private readonly PendingCheckoutRevoke $queue,
        private readonly LiveClient $liveClient,
        private readonly int $maxPerRun = 8,
    ) {}

    public function drain(): void
    {
        if ((new IranCircuitBreaker)->isOpen()) {
            return;
        }

        foreach ($this->queue->popBatch($this->maxPerRun) as $item) {
            $id = $item['id'];
            $telegramUserId = (int) ($item['telegram_user_id'] ?? 0);
            if ($telegramUserId <= 0) {
                $this->queue->delete($id);

                continue;
            }

            try {
                $result = $this->liveClient->checkoutRevokeOpenBestEffort($telegramUserId);
                if (empty($result['ok']) && ! empty($result['offline'])) {
                    $this->queue->markFailed($id, 'offline');

                    continue;
                }

                $this->queue->delete($id);
            } catch (\Throwable $e) {
                $this->queue->markFailed($id, $e->getMessage());
            }
        }

        $this->queue->pruneOld();
    }
}
