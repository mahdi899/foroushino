<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramJoinRequest;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\DestinationAccessPolicy;
use Illuminate\Support\Facades\RateLimiter;

class ChatJoinRequestHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly DestinationAccessPolicy $policy,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $chatId = (string) data_get($update->payload, 'chat_join_request.chat.id');
        $telegramUserId = (int) data_get($update->payload, 'chat_join_request.from.id');

        if ($chatId === '' || $telegramUserId <= 0) {
            return;
        }

        $rateKey = "telegram:join:{$chatId}:{$telegramUserId}";
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            $this->clients->forBot($bot)->declineChatJoinRequest($chatId, $telegramUserId);

            return;
        }
        RateLimiter::hit($rateKey, 3600);

        $destination = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('chat_id', $chatId)
            ->where('is_active', true)
            ->first();

        $account = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('telegram_user_id', $telegramUserId)
            ->first();

        $decision = $destination
            ? $this->policy->evaluate($destination, $account?->user_id)
            : ['allowed' => false, 'reason' => 'مقصد ناشناخته است.'];

        $join = TelegramJoinRequest::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_destination_id' => $destination?->id,
            'chat_id' => $chatId,
            'telegram_user_id' => $telegramUserId,
            'user_id' => $account?->user_id,
            'status' => $decision['allowed'] ? 'approved' : 'declined',
            'decision_reason' => $decision['reason'],
            'decided_at' => now(),
        ]);

        $client = $this->clients->forBot($bot);

        if ($decision['allowed']) {
            $client->approveChatJoinRequest($chatId, $telegramUserId);
            if ($account) {
                $client->sendMessage($telegramUserId, '✅ درخواست عضویت شما تأیید شد.');
            }
        } else {
            $client->declineChatJoinRequest($chatId, $telegramUserId);
            if ($account) {
                $client->sendMessage($telegramUserId, '❌ درخواست عضویت رد شد: '.$decision['reason']);
            }
        }

        unset($join);
    }
}
