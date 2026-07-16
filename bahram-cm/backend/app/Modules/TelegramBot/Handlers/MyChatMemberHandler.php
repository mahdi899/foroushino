<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;

class MyChatMemberHandler implements UpdateHandlerInterface
{
    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $userId = (int) data_get($update->payload, 'my_chat_member.from.id');
        $status = (string) data_get($update->payload, 'my_chat_member.new_chat_member.status');

        if ($userId <= 0) {
            return;
        }

        $account = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('telegram_user_id', $userId)
            ->first();

        if ($account === null) {
            return;
        }

        if (in_array($status, ['kicked', 'left'], true)) {
            $account->update(['is_blocked' => true]);
        } elseif (in_array($status, ['member', 'restricted'], true)) {
            $account->update(['is_blocked' => false]);
        }
    }
}
