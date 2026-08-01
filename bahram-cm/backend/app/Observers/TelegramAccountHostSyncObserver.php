<?php

namespace App\Observers;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Services\TelegramHostAccountSync;
use Illuminate\Support\Facades\DB;

class TelegramAccountHostSyncObserver
{
    public function saved(TelegramAccount $account): void
    {
        if (! $this->shouldSync($account)) {
            return;
        }

        $accountId = (int) $account->getKey();

        // Never touch the network while the write transaction is open — the
        // Iran→host hop can take seconds and would hold the telegram_accounts
        // row lock for the whole call, stalling every other request.
        DB::afterCommit(function () use ($accountId): void {
            $fresh = TelegramAccount::query()->find($accountId);
            if ($fresh !== null) {
                app(TelegramHostAccountSync::class)->queuePush($fresh);
            }
        });
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
