<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\RegistrationFlowService;

class CallbackQueryHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly RegistrationFlowService $registration,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $callback = (array) data_get($update->payload, 'callback_query', []);
        $from = (array) ($callback['from'] ?? []);
        $telegramUserId = (int) ($from['id'] ?? 0);
        $callbackId = (string) ($callback['id'] ?? '');
        $data = (string) ($callback['data'] ?? '');

        if ($telegramUserId <= 0) {
            return;
        }

        $account = TelegramAccount::query()->firstOrCreate(
            [
                'telegram_bot_id' => $bot->id,
                'telegram_user_id' => $telegramUserId,
            ],
            [
                'telegram_username' => $from['username'] ?? null,
                'first_name' => $from['first_name'] ?? null,
                'last_name' => $from['last_name'] ?? null,
            ],
        );

        $conversation = $this->conversations->forAccount($account);
        $this->registration->handleCallback($bot, $account, $conversation, $data);

        if ($callbackId !== '') {
            $this->clients->forBot($bot)->answerCallbackQuery($callbackId);
        }
    }
}
