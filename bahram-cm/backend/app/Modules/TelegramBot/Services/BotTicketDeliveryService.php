<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramMessageMap;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Shared delivery of admin ticket replies to the user's Telegram DM.
 */
class BotTicketDeliveryService
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
        private readonly SupportTicketBridgeService $bridge,
    ) {}

    /** @return Collection<int, Ticket> */
    public function openTicketsForBot(TelegramBot $bot, int $limit = 20, int $offset = 0): Collection
    {
        $userIds = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereNotNull('user_id')
            ->pluck('user_id');

        if ($userIds->isEmpty()) {
            return collect();
        }

        return Ticket::query()
            ->with(['user:id,name,mobile'])
            ->whereIn('user_id', $userIds)
            ->whereIn('status', ['open', 'answered', 'waiting_user'])
            ->latest('id')
            ->skip($offset)
            ->take($limit)
            ->get();
    }

    public function countOpenTicketsForBot(TelegramBot $bot): int
    {
        $userIds = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereNotNull('user_id')
            ->pluck('user_id');

        if ($userIds->isEmpty()) {
            return 0;
        }

        return Ticket::query()
            ->whereIn('user_id', $userIds)
            ->whereIn('status', ['open', 'answered', 'waiting_user'])
            ->count();
    }

    /**
     * Deliver an admin reply to the linked Telegram user (if any).
     *
     * @return array{delivered: bool, ticket_message: TicketMessage, telegram_account_id: ?int}
     */
    public function deliverAdminReply(
        Ticket $ticket,
        string $body,
        ?TelegramBot $preferredBot = null,
        ?int $adminUserId = null,
    ): array
    {
        $message = $this->bridge->appendUserMessage($ticket, $body, true, $adminUserId);

        $ticket->update(['status' => 'answered']);

        $account = $this->resolveTelegramAccount($ticket, $preferredBot);
        if ($account === null || $account->bot === null) {
            return [
                'delivered' => false,
                'ticket_message' => $message,
                'telegram_account_id' => null,
            ];
        }

        $bot = $account->bot;
        $client = $this->clients->forBot($bot);

        try {
            $sent = $client->sendMessage(
                (int) $account->telegram_user_id,
                "💬 پاسخ پشتیبانی (تیکت #{$ticket->id}):\n\n".$body,
            );
            $deliveredId = (int) ($sent['message_id'] ?? 0);

            if ($deliveredId > 0) {
                TelegramMessageMap::query()->create([
                    'ticket_id' => $ticket->id,
                    'direction' => 'support_to_user',
                    'source_chat_id' => (string) ($bot->reportsGroupChatId() ?: 'panel'),
                    'source_message_id' => 0,
                    'target_chat_id' => (string) $account->telegram_user_id,
                    'target_message_id' => $deliveredId,
                    'media_group_id' => null,
                ]);
            }

            return [
                'delivered' => $deliveredId > 0,
                'ticket_message' => $message,
                'telegram_account_id' => $account->id,
            ];
        } catch (Throwable) {
            return [
                'delivered' => false,
                'ticket_message' => $message,
                'telegram_account_id' => $account->id,
            ];
        }
    }

    public function formatTicketPreview(Ticket $ticket): string
    {
        $user = $ticket->user;
        $name = $user?->name ?? 'کاربر';
        $last = TicketMessage::query()
            ->where('ticket_id', $ticket->id)
            ->latest('id')
            ->first();

        $snippet = $last ? mb_substr((string) $last->message, 0, 120) : '—';

        return "🎫 تیکت #{$ticket->id}\n"
            ."وضعیت: {$ticket->status}\n"
            ."موضوع: {$ticket->subject}\n"
            ."کاربر: {$name}\n"
            ."آخرین پیام:\n{$snippet}";
    }

    private function resolveTelegramAccount(Ticket $ticket, ?TelegramBot $preferredBot): ?TelegramAccount
    {
        $query = TelegramAccount::query()
            ->with('bot')
            ->where('user_id', $ticket->user_id)
            ->where('is_blocked', false)
            ->orderByDesc('id');

        if ($preferredBot) {
            $hit = (clone $query)->where('telegram_bot_id', $preferredBot->id)->first();
            if ($hit) {
                return $hit;
            }
        }

        return $query->first();
    }
}
