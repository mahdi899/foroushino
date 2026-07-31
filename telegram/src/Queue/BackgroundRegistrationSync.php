<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Account\AccountCache;
use TelegramHost\Http\SyncClient;
use TelegramHost\Support\IranCircuitBreaker;

/** Drains pending registration upserts after the webhook response. */
final class BackgroundRegistrationSync
{
    public function __construct(
        private readonly PendingRegistrationSync $queue,
        private readonly SyncClient $sync,
        private readonly AccountCache $accounts,
        private readonly int $maxPerRun = 8,
    ) {}

    public function drain(): void
    {
        if ((new IranCircuitBreaker)->isOpen()) {
            return;
        }

        foreach ($this->queue->popBatch($this->maxPerRun) as $item) {
            $id = $item['id'];
            $payload = $item['payload'];
            $telegramUserId = (int) ($payload['telegram_user_id'] ?? $item['telegram_user_id']);
            $contactUserId = (int) ($payload['contact_user_id'] ?? 0);
            if ($contactUserId <= 0) {
                $contactUserId = $telegramUserId;
            }

            try {
                $response = $this->sync->call('registration/upsert', [
                    'telegram_user_id' => $telegramUserId,
                    'phone' => (string) ($payload['phone'] ?? $payload['mobile'] ?? ''),
                    'display_name' => isset($payload['display_name']) ? (string) $payload['display_name'] : null,
                    'contact_user_id' => $contactUserId,
                ], 6, allowRetry: false);

                if (empty($response['ok'])) {
                    $this->queue->markFailed($id, (string) ($response['message'] ?? 'upsert_failed'));

                    continue;
                }

                if (is_array($response['account'] ?? null)) {
                    $this->accounts->store($telegramUserId, $response['account']);
                }

                $this->queue->delete($id);
            } catch (\Throwable $e) {
                $this->queue->markFailed($id, $e->getMessage());
            }
        }

        $this->queue->pruneOld();
    }
}
