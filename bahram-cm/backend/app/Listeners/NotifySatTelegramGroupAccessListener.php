<?php

namespace App\Listeners;

use App\Events\SatMembershipActivated;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramUserDestinationsService;
use Illuminate\Support\Facades\Log;
use Throwable;

class NotifySatTelegramGroupAccessListener
{
    public function __construct(
        private readonly TelegramUserDestinationsService $destinations,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function handle(SatMembershipActivated $event): void
    {
        $user = $event->user;
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
        $options = $keyboard !== [] ? ['reply_markup' => ['inline_keyboard' => $keyboard]] : [];

        try {
            $this->clients->forBot($bot)->sendMessage(
                (int) $account->telegram_user_id,
                "🎉 عضویت سات شما فعال شد.\n\n".$section,
                array_merge(['parse_mode' => 'HTML'], $options),
            );
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('sat_group_access_notify_failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
