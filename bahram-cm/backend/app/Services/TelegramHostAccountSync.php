<?php

namespace App\Services;

use App\Jobs\PushTelegramHostSyncJob;
use App\Modules\TelegramBot\Models\TelegramAccount;

/** Queues account + snapshot push to the external Telegram host. */
class TelegramHostAccountSync
{
    public function __construct(private readonly TelegramHostAccountSnapshotService $snapshots) {}

    public function queuePush(TelegramAccount $account): void
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production') {
            return;
        }

        PushTelegramHostSyncJob::account($this->snapshots->accountPayload($account->fresh(['user', 'bot'])));
    }

    /**
     * Push snapshot + send Telegram message from the host immediately (event-driven, no cron).
     *
     * @param  array<string, mixed>  $options
     */
    public function pushPaidOrderNotification(TelegramAccount $account, string $text, array $options = []): bool
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production' || trim($text) === '') {
            return false;
        }

        $payload = $this->snapshots->accountPayload($account->fresh(['user', 'bot']));
        $push = app(TelegramHostPushService::class);
        $ok = $push->pushAccountWithNotification($payload, [
            'text' => $text,
            'options' => $options,
        ]);

        if (! $ok) {
            PushTelegramHostSyncJob::dispatch('push_account', [
                'account' => $payload,
                'notification' => ['text' => $text, 'options' => $options],
            ]);
        }

        return $ok;
    }
}
