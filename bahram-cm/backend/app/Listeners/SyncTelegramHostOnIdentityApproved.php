<?php

namespace App\Listeners;

use App\Events\IdentityLevel2Approved;
use App\Services\TelegramHostAccountSync;
use App\Services\TelegramInfrastructureService;
use Illuminate\Support\Facades\Log;

/**
 * Push the updated account snapshot (verification level, display name, owned
 * products) to the foreign Telegram host immediately after KYC approval.
 */
class SyncTelegramHostOnIdentityApproved
{
    public function __construct(
        private readonly TelegramHostAccountSync $hostSync,
        private readonly TelegramInfrastructureService $infra,
    ) {}

    public function handle(IdentityLevel2Approved $event): void
    {
        $user = $event->user->fresh(['identityProfile', 'profile']);
        if ($user === null) {
            return;
        }

        $this->hostSync->syncDisplayNamesForUser($user);

        $pushed = $this->hostSync->pushUserAccountsImmediate($user);

        if ($pushed === 0 && $this->infra->usesHostBridge()) {
            $this->hostSync->pushMobileAccessImmediate($user);
        }

        Log::channel('telegram')->info('identity_approved_host_sync', [
            'user_id' => $user->id,
            'accounts_pushed' => $pushed,
            'uses_host' => $this->infra->usesHostBridge(),
        ]);
    }
}
