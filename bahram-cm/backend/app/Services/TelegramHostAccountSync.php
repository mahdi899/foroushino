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
}
