<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramMessageMap;
use App\Modules\TelegramBot\Models\TelegramSupportCategory;

class SupportTicketBridgeService
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function openOrContinue(TelegramAccount $account, string $categoryKey, string $subject): Ticket
    {
        if (! $account->user_id) {
            throw new \RuntimeException('Telegram account is not linked to a user.');
        }

        $open = Ticket::query()
            ->where('user_id', $account->user_id)
            ->whereIn('status', ['open', 'answered', 'waiting_user'])
            ->latest('id')
            ->first();

        if ($open) {
            return $open;
        }

        return Ticket::query()->create([
            'user_id' => $account->user_id,
            'department' => $categoryKey,
            'subject' => $subject,
            'status' => 'open',
            'priority' => 'normal',
        ]);
    }

    public function appendUserMessage(Ticket $ticket, string $body, bool $isAdmin = false): TicketMessage
    {
        return TicketMessage::query()->create([
            'ticket_id' => $ticket->id,
            'message' => $body,
            'is_admin_reply' => $isAdmin,
        ]);
    }

    public function mirrorToSupportGroup(
        TelegramBot $bot,
        Ticket $ticket,
        TelegramAccount $account,
        int $sourceMessageId,
        ?int $topicId = null,
    ): void {
        $supportChatId = $bot->support_group_chat_id;
        if (blank($supportChatId)) {
            return;
        }

        $client = $this->clients->forBot($bot);
        $options = [];
        if ($topicId) {
            $options['message_thread_id'] = $topicId;
        }

        $copied = $client->copyMessage(
            $supportChatId,
            $account->telegram_user_id,
            $sourceMessageId,
            $options,
        );

        $targetMessageId = (int) ($copied['message_id'] ?? 0);
        if ($targetMessageId <= 0) {
            return;
        }

        TelegramMessageMap::query()->create([
            'ticket_id' => $ticket->id,
            'direction' => 'user_to_support',
            'source_chat_id' => (string) $account->telegram_user_id,
            'source_message_id' => $sourceMessageId,
            'target_chat_id' => (string) $supportChatId,
            'target_message_id' => $targetMessageId,
            'target_thread_id' => $topicId,
        ]);
    }

    public function categoryTopicId(string $categoryKey): ?int
    {
        $category = TelegramSupportCategory::query()->where('key', $categoryKey)->where('is_active', true)->first();

        return $category?->default_topic_id ? (int) $category->default_topic_id : null;
    }
}
