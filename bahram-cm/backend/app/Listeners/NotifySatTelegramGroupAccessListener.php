<?php

namespace App\Listeners;

use App\Events\IdentityLevel2Approved;
use App\Events\SatApplicationAccepted;
use App\Events\SatMembershipActivated;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramUserDestinationsService;
use App\Services\Sat\SatParticipantAccessService;
use Illuminate\Support\Facades\Log;
use Throwable;

class NotifySatTelegramGroupAccessListener
{
    public function __construct(
        private readonly TelegramUserDestinationsService $destinations,
        private readonly TelegramBotClientFactory $clients,
        private readonly SatParticipantAccessService $satAccess,
    ) {}

    public function handle(SatMembershipActivated|SatApplicationAccepted|IdentityLevel2Approved $event): void
    {
        $user = $event->user;
        $this->satAccess->ensureMembershipActivated($user);

        if (! $this->satAccess->hasOpenedAccess($user->fresh(['satMembership', 'identityProfile']))) {
            return;
        }

        $bot = TelegramBot::query()
            ->where('key', 'production')
            ->where('is_active', true)
            ->first();

        if ($bot === null) {
            return;
        }

        $account = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('user_id', $user->id)
            ->first();

        if ($account === null) {
            return;
        }

        $section = $this->destinations->formatSatSection($bot, $account);
        if ($section === null) {
            return;
        }

        $keyboard = $this->destinations->satKeyboardRows($bot, $account);
        if ($keyboard === []) {
            return;
        }

        $options = ['reply_markup' => ['inline_keyboard' => $keyboard], 'parse_mode' => 'HTML'];

        try {
            $this->clients->forBot($bot)->sendMessage(
                (int) $account->telegram_user_id,
                "🎉 دسترسی گروه سات برای شما فعال شد.\n\n".$section,
                $options,
            );
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('sat_group_access_notify_failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
