<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;

class ChatMemberHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly RequiredChatMembershipService $membership,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $userId = (int) data_get($update->payload, 'chat_member.from.id');
        $chatId = (string) data_get($update->payload, 'chat_member.chat.id');

        if ($userId > 0) {
            $this->membership->invalidateCache($bot, $userId, $chatId);
        }

        $account = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('telegram_user_id', $userId)
            ->first();

        $newStatus = (string) data_get($update->payload, 'chat_member.new_chat_member.status');
        if ($account && in_array($newStatus, ['kicked', 'left'], true)) {
            // Lock features via membership gate; do not unlink account.
            $this->membership->invalidateCache($bot, $userId);
        }
    }
}
