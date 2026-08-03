<?php

namespace App\Services;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Services\TelegramHostPushService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/** Soft-reset Telegram registration on Iran + foreign host without deleting user data. */
class TelegramHostReregisterService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly TelegramHostPushService $hostPush,
    ) {}

    public function softReregister(TelegramAccount $account, ?User $actor = null): bool
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production') {
            return false;
        }

        $oldMobile = trim((string) ($account->mobile ?? ''));
        $telegramUserId = (int) $account->telegram_user_id;

        DB::transaction(function () use ($account, $actor, $oldMobile): void {
            $metadata = (array) ($account->metadata ?? []);
            $metadata['reregister_at'] = now()->toIso8601String();
            if ($actor !== null) {
                $metadata['reregister_by'] = $actor->id;
            }

            $account->update([
                'mobile' => null,
                'mobile_verified_at' => null,
                'metadata' => $metadata,
            ]);

            $conversation = $this->conversations->forAccount($account);
            $this->conversations->reset($conversation);
        });

        $hostOk = $this->hostPush->resetRegistration($telegramUserId, $oldMobile !== '' ? $oldMobile : null);

        if ($oldMobile !== '') {
            $this->hostPush->revokeMobileAccess($oldMobile);
        }

        Log::channel('telegram')->info('telegram.host.soft_reregister', [
            'telegram_user_id' => $telegramUserId,
            'telegram_account_id' => $account->id,
            'old_mobile' => $oldMobile !== '' ? $oldMobile : null,
            'actor_user_id' => $actor?->id,
            'host_ok' => $hostOk,
        ]);

        return $hostOk;
    }
}
