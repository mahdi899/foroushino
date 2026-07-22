<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramMessageMap;
use App\Modules\TelegramBot\Models\TelegramSupportCategory;
use App\Modules\TelegramBot\Support\TelegramHtml;
use Illuminate\Support\Facades\Log;
use Throwable;

class SupportTicketBridgeService
{
    /** @var array<string, string> */
    public const CATEGORY_HASHTAGS = [
        'purchase' => 'خرید',
        'campaign_course' => 'کمپین',
        'sat' => 'سات',
        'other' => 'سایر',
    ];

    /** @var array<string, string> */
    public const CATEGORY_LABELS = [
        'purchase' => 'خرید و پرداخت',
        'campaign_course' => 'دوره کمپین‌نویسی',
        'sat' => 'سات',
        'other' => 'سایر',
    ];

    private const CONFIRM_EMOJIS = ['✅', '👍', '👌', '🔥', '💯'];

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

    public function appendUserMessage(Ticket $ticket, string $body, bool $isAdmin = false, ?int $adminUserId = null): TicketMessage
    {
        return TicketMessage::query()->create([
            'ticket_id' => $ticket->id,
            'user_id' => $adminUserId,
            'message' => $body,
            'is_admin_reply' => $isAdmin,
        ]);
    }

    /**
     * Forward user message to reports group, then reply with category hashtag + numeric user ID.
     * Admins reply to that ID message to answer the user.
     *
     * @return array{forward_message_id: int, id_message_id: int, support_chat_id: string, topic_id: ?int}
     */
    public function mirrorToSupportGroup(
        TelegramBot $bot,
        Ticket $ticket,
        TelegramAccount $account,
        int $sourceMessageId,
        ?int $topicId = null,
        string $categoryKey = 'other',
        ?int $replyToGroupMessageId = null,
    ): array {
        $supportChatId = $bot->reportsGroupChatId();
        if (blank($supportChatId)) {
            throw new \RuntimeException('گروه گزارشات تنظیم نشده است.');
        }

        $client = $this->clients->forBot($bot);
        $options = [];
        if ($topicId) {
            $options['message_thread_id'] = $topicId;
        }
        if ($replyToGroupMessageId && $replyToGroupMessageId > 0) {
            $options['reply_to_message_id'] = $replyToGroupMessageId;
        }

        $forwarded = $client->forwardMessage(
            $supportChatId,
            $account->telegram_user_id,
            $sourceMessageId,
            $options,
        );

        $forwardMessageId = (int) ($forwarded['message_id'] ?? 0);
        if ($forwardMessageId <= 0) {
            throw new \RuntimeException('ارسال پیام به گروه گزارشات ناموفق بود.');
        }

        $hashtag = self::CATEGORY_HASHTAGS[$categoryKey] ?? 'سایر';
        $idBody = self::formatSupportIdentityMessage($account, $hashtag);

        $idMessage = $client->sendMessage($supportChatId, $idBody, [
            'parse_mode' => 'HTML',
            'message_thread_id' => $topicId,
            'reply_to_message_id' => $forwardMessageId,
        ]);

        $idMessageId = (int) ($idMessage['message_id'] ?? 0);
        if ($idMessageId > 0) {
            TelegramMessageMap::query()->create([
                'ticket_id' => $ticket->id,
                'direction' => 'user_to_support',
                'source_chat_id' => (string) $account->telegram_user_id,
                'source_message_id' => $sourceMessageId,
                'target_chat_id' => (string) $supportChatId,
                'target_message_id' => $idMessageId,
                'target_thread_id' => $topicId,
                'media_group_id' => (string) $forwardMessageId,
            ]);
        }

        return [
            'forward_message_id' => $forwardMessageId,
            'id_message_id' => $idMessageId,
            'support_chat_id' => (string) $supportChatId,
            'topic_id' => $topicId,
        ];
    }

    /**
     * User replies to a support message inside the private bot chat → mirror into reports group.
     *
     * @param  array<string, mixed>  $message
     */
    public function tryHandleUserReplyToSupport(
        TelegramBot $bot,
        TelegramAccount $account,
        array $message,
    ): bool {
        if (blank($bot->reportsGroupChatId())) {
            return false;
        }

        $replyToId = (int) data_get($message, 'reply_to_message.message_id');
        $userMessageId = (int) ($message['message_id'] ?? 0);
        $userChatId = (string) data_get($message, 'chat.id', $account->telegram_user_id);

        if ($replyToId <= 0 || $userMessageId <= 0) {
            return false;
        }

        // Only treat replies to bot messages that we mapped as support thread messages.
        $map = TelegramMessageMap::query()
            ->where('direction', 'support_to_user')
            ->where('target_chat_id', $userChatId)
            ->where('target_message_id', $replyToId)
            ->latest('id')
            ->first();

        if ($map === null) {
            return false;
        }

        $ticket = $map->ticket_id
            ? Ticket::query()->find($map->ticket_id)
            : null;

        if ($ticket === null) {
            return false;
        }

        $text = trim((string) ($message['text'] ?? $message['caption'] ?? ''));
        $hasMedia = isset($message['photo'])
            || isset($message['document'])
            || isset($message['video'])
            || isset($message['voice'])
            || isset($message['audio'])
            || isset($message['sticker']);

        if ($text === '' && ! $hasMedia) {
            return false;
        }

        $categoryKey = (string) ($ticket->department ?: 'other');
        if (! isset(self::CATEGORY_HASHTAGS[$categoryKey])) {
            $categoryKey = 'other';
        }

        $client = $this->clients->forBot($bot);

        try {
            $this->appendUserMessage($ticket, $text !== '' ? $text : '[رسانه]');
            $mirrored = $this->mirrorToSupportGroup(
                $bot,
                $ticket,
                $account,
                $userMessageId,
                $map->target_thread_id ? (int) $map->target_thread_id : $this->categoryTopicId($categoryKey),
                $categoryKey,
                (int) $map->source_message_id ?: null,
            );

            $ack = $client->sendMessage(
                $userChatId,
                "✅ پاسخ شما ارسال شد.\nبرای ادامه گفتگو، روی پیام پشتیبانی Reply بزنید.",
            );
            $ackId = (int) ($ack['message_id'] ?? 0);
            if ($ackId > 0 && $mirrored['id_message_id'] > 0) {
                $this->mapSupportThreadToUser(
                    $ticket->id,
                    $mirrored['support_chat_id'],
                    $mirrored['id_message_id'],
                    $userChatId,
                    $ackId,
                    $mirrored['topic_id'],
                    $mirrored['forward_message_id'],
                );
            }

            $this->reactConfirm($client, $userChatId, $userMessageId);
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('User support reply mirror failed.', [
                'error' => $e->getMessage(),
                'user_id' => $account->telegram_user_id,
            ]);
            $client->sendMessage($userChatId, 'ارسال پاسخ پشتیبانی ناموفق بود. لطفاً دوباره تلاش کنید.');
        }

        return true;
    }

    public function mapSupportThreadToUser(
        int $ticketId,
        string $supportChatId,
        int $groupMessageId,
        string $userChatId,
        int $userMessageId,
        ?int $topicId = null,
        int|string|null $forwardMessageId = null,
    ): void {
        if ($ticketId <= 0 || $groupMessageId <= 0 || $userMessageId <= 0) {
            return;
        }

        TelegramMessageMap::query()->create([
            'ticket_id' => $ticketId,
            'direction' => 'support_to_user',
            'source_chat_id' => $supportChatId,
            'source_message_id' => $groupMessageId,
            'target_chat_id' => $userChatId,
            'target_message_id' => $userMessageId,
            'target_thread_id' => $topicId,
            'media_group_id' => $forwardMessageId !== null ? (string) $forwardMessageId : null,
        ]);
    }

    public function categoryTopicId(string $categoryKey): ?int
    {
        $category = TelegramSupportCategory::query()->where('key', $categoryKey)->where('is_active', true)->first();

        return $category?->default_topic_id ? (int) $category->default_topic_id : null;
    }

    public function categoryHashtag(string $categoryKey): string
    {
        return self::CATEGORY_HASHTAGS[$categoryKey] ?? 'سایر';
    }

    public static function formatSupportIdentityMessage(TelegramAccount $account, string $hashtag): string
    {
        $account->loadMissing('user');
        $userId = (int) $account->telegram_user_id;
        $name = self::resolveAccountDisplayName($account);

        return TelegramHtml::bold('پشتیبانی 🎫')
            ."\n#".TelegramHtml::escape($hashtag)
            ."\n".TelegramHtml::bold('نام: ').TelegramHtml::escape($name)
            ."\n".TelegramHtml::bold('شناسه: ')
            .TelegramHtml::link('tg://openmessage?user_id='.$userId, (string) $userId);
    }

    private static function resolveAccountDisplayName(TelegramAccount $account): string
    {
        $siteName = trim((string) ($account->user?->name ?? ''));
        if ($siteName !== '') {
            return $siteName;
        }

        $telegramName = trim((string) ($account->display_name ?: trim(($account->first_name ?? '').' '.($account->last_name ?? ''))));
        if ($telegramName !== '') {
            return $telegramName;
        }

        if (filled($account->telegram_username)) {
            return '@'.$account->telegram_username;
        }

        return 'کاربر تلگرام';
    }

    public function reactConfirm(TelegramBotClientInterface $client, int|string $chatId, int $messageId): void
    {
        $candidates = $this->resolveConfirmEmojis($client, (string) $chatId);

        foreach ($candidates as $emoji) {
            try {
                if (str_starts_with($emoji, 'custom:')) {
                    $client->setMessageReaction($chatId, $messageId, [
                        ['type' => 'custom_emoji', 'custom_emoji_id' => substr($emoji, 7)],
                    ]);
                } else {
                    $client->setMessageReaction($chatId, $messageId, [
                        ['type' => 'emoji', 'emoji' => $emoji],
                    ]);
                }

                return;
            } catch (Throwable $e) {
                Log::channel('telegram')->warning('Support reaction attempt failed.', [
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'emoji' => $emoji,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /** @return list<string> */
    private function resolveConfirmEmojis(TelegramBotClientInterface $client, string $chatId): array
    {
        try {
            $chat = $client->getChat($chatId);
            $available = data_get($chat, 'available_reactions');
            if (is_array($available) && $available !== []) {
                $allowedEmoji = [];
                $allowedCustom = [];
                foreach ($available as $item) {
                    $type = (string) ($item['type'] ?? '');
                    if ($type === 'emoji' && filled($item['emoji'] ?? null)) {
                        $allowedEmoji[] = (string) $item['emoji'];
                    }
                    if ($type === 'custom_emoji' && filled($item['custom_emoji_id'] ?? null)) {
                        $allowedCustom[] = (string) $item['custom_emoji_id'];
                    }
                }

                if ($allowedEmoji !== []) {
                    $preferred = array_values(array_intersect(self::CONFIRM_EMOJIS, $allowedEmoji));

                    return $preferred !== [] ? $preferred : array_values($allowedEmoji);
                }

                if ($allowedCustom !== []) {
                    return array_map(
                        static fn (string $id): string => 'custom:'.$id,
                        array_slice($allowedCustom, 0, 3),
                    );
                }
            }
        } catch (Throwable) {
            // Fall through to defaults.
        }

        return self::CONFIRM_EMOJIS;
    }
}
