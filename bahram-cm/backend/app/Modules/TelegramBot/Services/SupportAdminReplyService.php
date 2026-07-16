<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\TicketMessage;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramMessageMap;
use App\Modules\TelegramBot\Models\TelegramOperatorProfile;
use App\Modules\TelegramBot\Support\TelegramHtml;

class SupportAdminReplyService
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
    ) {}

    /** @param  array<string, mixed>  $message */
    public function handleIncomingSupportMessage(TelegramBot $bot, array $message): void
    {
        $replyToId = (int) data_get($message, 'reply_to_message.message_id');
        $fromId = (int) data_get($message, 'from.id');
        $text = trim((string) ($message['text'] ?? $message['caption'] ?? ''));

        if ($replyToId <= 0 || $fromId <= 0 || $text === '') {
            return;
        }

        $map = TelegramMessageMap::query()
            ->where('target_chat_id', (string) $bot->support_group_chat_id)
            ->where('target_message_id', $replyToId)
            ->where('direction', 'user_to_support')
            ->first();

        if ($map === null) {
            return;
        }

        $operator = TelegramOperatorProfile::query()
            ->where('telegram_user_id', $fromId)
            ->where('is_active', true)
            ->first();

        $displayName = $operator?->display_name
            ?: trim(((string) data_get($message, 'from.first_name')).' '.((string) data_get($message, 'from.last_name')));

        if ($displayName === '') {
            $displayName = 'ادمین پشتیبانی';
        }

        TicketMessage::query()->create([
            'ticket_id' => $map->ticket_id,
            'message' => $text,
            'is_admin_reply' => true,
        ]);

        $body = TelegramHtml::bold($displayName)."\n".TelegramHtml::escape($text);

        $this->clients->forBot($bot)->sendMessage(
            $map->source_chat_id,
            $body,
            ['parse_mode' => 'HTML'],
        );
    }
}
