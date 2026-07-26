<?php

namespace App\Observers;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Services\TelegramHostAccountSync;

class TelegramAccountHostSyncObserver
{
    public function saved(TelegramAccount $account): void
    {
        if (! $this->shouldSync($account)) {
            return;
        }

        app(TelegramHostAccountSync::class)->queuePush($account);
    }

    private function shouldSync(TelegramAccount $account): bool
    {
        if ($account->wasRecentlyCreated) {
            return $account->mobile_verified_at !== null;
        }

        return $account->wasChanged([
            'user_id',
            'mobile',
            'mobile_verified_at',
            'display_name',
            'is_bot_admin',
            'is_blocked',
        ]);
    }
}
