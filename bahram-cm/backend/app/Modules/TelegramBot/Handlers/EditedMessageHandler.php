<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramMessageMap;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Support\TelegramHtml;

class EditedMessageHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $edited = (array) data_get($update->payload, 'edited_message', []);
        $chatId = (string) data_get($edited, 'chat.id');
        $messageId = (int) data_get($edited, 'message_id');
        $text = trim((string) ($edited['text'] ?? $edited['caption'] ?? ''));

        if ($chatId === '' || $messageId <= 0 || $text === '') {
            return;
        }

        $map = TelegramMessageMap::query()
            ->where('source_chat_id', $chatId)
            ->where('source_message_id', $messageId)
            ->where('direction', 'user_to_support')
            ->first();

        if ($map === null || blank($bot->support_group_chat_id)) {
            return;
        }

        $client = $this->clients->forBot($bot);
        $body = TelegramHtml::bold('نسخه ویرایش‌شده')."\n".TelegramHtml::escape($text);

        try {
            $client->editMessageText($body, [
                'chat_id' => $map->target_chat_id,
                'message_id' => $map->target_message_id,
                'parse_mode' => 'HTML',
            ]);
        } catch (\Throwable) {
            $client->sendMessage($map->target_chat_id, $body, [
                'parse_mode' => 'HTML',
                'message_thread_id' => $map->target_thread_id,
            ]);
        }

        $map->update([
            'edit_version' => $map->edit_version + 1,
            'edited_at' => now(),
        ]);
    }
}
