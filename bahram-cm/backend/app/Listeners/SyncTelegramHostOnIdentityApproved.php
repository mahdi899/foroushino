<?php

namespace App\Listeners;

use App\Events\IdentityLevel2Approved;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Services\TelegramHostAccountSync;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * After expert KYC approval, push the student snapshot to the external Telegram host
 * so deep-link /start reference can resolve entitlements and invites immediately.
 */
class SyncTelegramHostOnIdentityApproved
{
    public function __construct(
        private readonly TelegramHostAccountSync $hostSync,
    ) {}

    public function handle(IdentityLevel2Approved $event): void
    {
        $user = $event->user;

        try {
            $accounts = TelegramAccount::query()
                ->where('user_id', $user->id)
                ->whereHas('bot', fn ($q) => $q->where('key', 'production'))
                ->get();

            if ($accounts->isEmpty()) {
                $this->hostSync->queuePushMobileAccess($user);

                return;
            }

            foreach ($accounts as $account) {
                $this->hostSync->queuePush($account);
            }
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('Failed to queue host sync after identity approval.', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
