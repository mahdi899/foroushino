<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Queue\PendingSupportForward;
use TelegramHost\Queue\PendingTicketSync;
use TelegramHost\Telegram\BotApiClient;

/**
 * Support tickets run entirely on the foreign host:
 * user message → ack instantly → queue forward → reports group → staff reply → user.
 * CRM ticket sync to Iran runs after the webhook response.
 */
final class HostSupportService
{
    /** @var array<string, string> */
    public const CATEGORY_LABELS = [
        'purchase' => 'خرید و پرداخت',
        'campaign_course' => 'دوره کمپین‌نویسی',
        'sat' => 'سات',
        'other' => 'سایر',
    ];

    /** @var array<string, string> */
    public const CATEGORY_HASHTAGS = [
        'purchase' => 'خرید',
        'campaign_course' => 'کمپین',
        'sat' => 'سات',
        'other' => 'سایر',
    ];

    /** @var list<string> */
    private const CANCEL_TEXTS = ['لغو', '/cancel', 'انصراف', 'cancel'];

    /** @var list<string> */
    private const CONFIRM_EMOJIS = ['✅', '👍', '👌'];

    /** @var list<string> */
    private const FAIL_EMOJIS = ['❌', '👎', '🚫'];

    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly ConversationRepository $conversations,
        private readonly AccountCache $accounts,
        private readonly MainMenu $mainMenu,
        private readonly \PDO $pdo,
        private readonly ?PendingTicketSync $ticketSync = null,
        private readonly ?PendingSupportForward $forwardQueue = null,
    ) {}

    public function prepare(int $telegramUserId, string $category): void
    {
        $this->conversations->set($telegramUserId, 'waiting_for_support_message', [
            'category' => $category,
        ]);
    }

    public function isCancelText(string $text): bool
    {
        return in_array(trim($text), self::CANCEL_TEXTS, true);
    }

    /**
     * Local reports-group id only — never block the user on an Iran bootstrap pull.
     * Mirror is filled by Iran→host push (or optional config.php override).
     */
    private function refreshedReportsGroupChatId(): ?string
    {
        return $this->cache->reportsGroupChatId();
    }

    /**
     * @param array<string, mixed> $message
     */
    public function handleUserMessage(int $chatId, int $telegramUserId, array $message): void
    {
        $text = trim((string) ($message['text'] ?? $message['caption'] ?? ''));
        $conversation = $this->conversations->get($telegramUserId);
        $category = (string) ($conversation['context']['category'] ?? 'other');
        if (! $this->cache->isKnownSupportCategory($category)) {
            $category = 'other';
        }

        $reportsChat = $this->refreshedReportsGroupChatId();
        if ($reportsChat === null || $reportsChat === '') {
            $this->conversations->set($telegramUserId, 'idle', []);
            $this->api->sendMessage($chatId, '⛔ گروه گزارشات هنوز تنظیم نشده است. لطفاً از پنل ادمین سایت «گروه گزارشات» را تنظیم کنید یا کمی بعد دوباره تلاش کنید.', [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);

            return;
        }

        $sourceMessageId = (int) ($message['message_id'] ?? 0);
        if ($sourceMessageId <= 0) {
            $this->api->sendMessage($chatId, 'ارسال پیام پشتیبانی ناموفق بود. لطفاً دوباره تلاش کنید.');

            return;
        }

        $hasMedia = isset($message['photo'])
            || isset($message['document'])
            || isset($message['video'])
            || isset($message['voice'])
            || isset($message['audio'])
            || isset($message['sticker']);

        if ($text === '' && ! $hasMedia) {
            return;
        }

        // Ack first — never wait on forward/identity Telegram RTTs in the webhook.
        $this->conversations->set($telegramUserId, 'idle', []);
        $ack = $this->api->sendMessageResult(
            $chatId,
            $this->cache->message('support_message_received', 'پیام شما برای پشتیبانی ارسال شد.'),
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ],
        );
        $ackId = (int) ($ack['message_id'] ?? 0);

        $payload = [
            'chat_id' => $chatId,
            'telegram_user_id' => $telegramUserId,
            'source_message_id' => $sourceMessageId,
            'category' => $category,
            'text' => $text,
            'has_media' => $hasMedia,
            'ack_id' => $ackId,
            'reports_chat' => $reportsChat,
        ];

        if ($this->forwardQueue !== null) {
            $this->forwardQueue->push($payload);
        }

        // Process immediately after ack. The queue is a retry buffer for the
        // next webhook drain if Telegram forward fails transiently — waiting
        // only on post-response drain was too easy to miss on PHP built-in
        // servers and left support looking "broken" with zero maps.
        try {
            $this->processQueuedForward($payload);
            // Successful sync path — drop the queued copy so drain won't double-send.
            if ($this->forwardQueue !== null) {
                foreach ($this->forwardQueue->popBatch(10) as $item) {
                    $queuedUser = (int) ($item['payload']['telegram_user_id'] ?? 0);
                    $queuedSrc = (int) ($item['payload']['source_message_id'] ?? 0);
                    if ($queuedUser === $telegramUserId && $queuedSrc === $sourceMessageId) {
                        $this->forwardQueue->delete($item['id']);
                    }
                }
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] support forward failed (category='.$category.', user='.$telegramUserId.'): '.$e->getMessage());
            // Queued row (if any) remains for BackgroundSupportForward retry.
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function processQueuedForward(array $payload): void
    {
        $chatId = (int) ($payload['chat_id'] ?? 0);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $sourceMessageId = (int) ($payload['source_message_id'] ?? 0);
        $category = (string) ($payload['category'] ?? 'other');
        $text = (string) ($payload['text'] ?? '');
        $hasMedia = (bool) ($payload['has_media'] ?? false);
        $ackId = (int) ($payload['ack_id'] ?? 0);
        $reportsChat = trim((string) ($payload['reports_chat'] ?? ''));

        if ($reportsChat === '') {
            $reportsChat = (string) ($this->refreshedReportsGroupChatId() ?? '');
        }
        if ($reportsChat === '' || $chatId <= 0 || $telegramUserId <= 0 || $sourceMessageId <= 0) {
            throw new \RuntimeException('invalid_support_forward_payload');
        }

        if (! $this->cache->isKnownSupportCategory($category)) {
            $category = 'other';
        }

        $topicId = $this->cache->supportTopicId($category);
        $forwardOptions = [];
        if ($topicId !== null && $topicId > 0) {
            $forwardOptions['message_thread_id'] = $topicId;
        }

        try {
            $forwardMessageId = 0;
            try {
                $forwarded = $this->api->forwardMessage($reportsChat, $chatId, $sourceMessageId, $forwardOptions);
                $forwardMessageId = (int) ($forwarded['message_id'] ?? 0);
            } catch (\Throwable $forwardError) {
                error_log('[telegram-host] support forwardMessage: '.$forwardError->getMessage());
            }

            if ($forwardMessageId <= 0) {
                // Privacy / forward restrictions — copy still delivers content to staff.
                $copied = $this->api->copyMessage($reportsChat, $chatId, $sourceMessageId, $forwardOptions);
                $forwardMessageId = (int) ($copied['message_id'] ?? 0);
            }
            if ($forwardMessageId <= 0) {
                throw new \RuntimeException('forward_failed');
            }

            $hashtag = self::CATEGORY_HASHTAGS[$category] ?? 'سایر';
            $idBody = $this->formatIdentityMessage($telegramUserId, $hashtag);
            $idMessage = $this->api->sendMessageResult($reportsChat, $idBody, [
                'parse_mode' => 'HTML',
                'reply_to_message_id' => $forwardMessageId,
                ...($topicId !== null && $topicId > 0 ? ['message_thread_id' => $topicId] : []),
            ]);
            $idMessageId = (int) ($idMessage['message_id'] ?? 0);

            if ($idMessageId > 0) {
                $this->storeMap([
                    'direction' => 'user_to_support',
                    'source_chat_id' => (string) $telegramUserId,
                    'source_message_id' => $sourceMessageId,
                    'target_chat_id' => (string) $reportsChat,
                    'target_message_id' => $idMessageId,
                    'target_thread_id' => $topicId,
                    'forward_message_id' => $forwardMessageId,
                ]);
            }

            if ($ackId > 0 && $idMessageId > 0) {
                $this->storeMap([
                    'direction' => 'support_to_user',
                    'source_chat_id' => (string) $reportsChat,
                    'source_message_id' => $idMessageId,
                    'target_chat_id' => (string) $chatId,
                    'target_message_id' => $ackId,
                    'target_thread_id' => $topicId,
                    'forward_message_id' => $sourceMessageId,
                ]);
            }

            $this->ticketSync?->push([
                'telegram_user_id' => $telegramUserId,
                'category' => $category,
                'text' => $text,
                'has_media' => $hasMedia,
                'message_id' => $sourceMessageId,
            ]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] support forward failed (category='.$category.', user='.$telegramUserId.'): '.$e->getMessage());
            if ($chatId > 0) {
                $this->api->sendMessage($chatId, 'ارسال پیام پشتیبانی به گروه گزارشات ناموفق بود. لطفاً دوباره از منو «پشتیبانی» را بزنید.');
            }
            throw $e;
        }
    }

    /**
     * User Reply on a prior support ack → mirror back into reports group.
     *
     * @param array<string, mixed> $message
     */
    public function tryHandleUserReply(int $telegramUserId, array $message): bool
    {
        $reportsChat = $this->cache->reportsGroupChatId();
        if ($reportsChat === null || $reportsChat === '') {
            return false;
        }

        $replyToId = (int) ($message['reply_to_message']['message_id'] ?? 0);
        $userMessageId = (int) ($message['message_id'] ?? 0);
        $userChatId = (string) ($message['chat']['id'] ?? $telegramUserId);

        if ($replyToId <= 0 || $userMessageId <= 0) {
            return false;
        }

        $map = $this->findMap('support_to_user', (string) $userChatId, $replyToId);
        if ($map === null) {
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

        $topicId = isset($map['target_thread_id']) && $map['target_thread_id'] !== null
            ? (int) $map['target_thread_id']
            : null;
        $replyToGroup = (int) ($map['source_message_id'] ?? 0);

        try {
            $options = [];
            if ($topicId !== null && $topicId > 0) {
                $options['message_thread_id'] = $topicId;
            }
            if ($replyToGroup > 0) {
                $options['reply_to_message_id'] = $replyToGroup;
            }

            $forwarded = $this->api->forwardMessage($reportsChat, (int) $userChatId, $userMessageId, $options);
            $forwardMessageId = (int) ($forwarded['message_id'] ?? 0);
            if ($forwardMessageId > 0) {
                $hashtag = 'ادامه';
                $idBody = $this->formatIdentityMessage($telegramUserId, $hashtag);
                $idMessage = $this->api->sendMessageResult($reportsChat, $idBody, [
                    'parse_mode' => 'HTML',
                    'reply_to_message_id' => $forwardMessageId,
                    ...($topicId !== null && $topicId > 0 ? ['message_thread_id' => $topicId] : []),
                ]);
                $idMessageId = (int) ($idMessage['message_id'] ?? 0);
                if ($idMessageId > 0) {
                    $this->storeMap([
                        'direction' => 'user_to_support',
                        'source_chat_id' => (string) $telegramUserId,
                        'source_message_id' => $userMessageId,
                        'target_chat_id' => (string) $reportsChat,
                        'target_message_id' => $idMessageId,
                        'target_thread_id' => $topicId,
                        'forward_message_id' => $forwardMessageId,
                    ]);
                }
            }

            $this->api->sendMessage(
                (int) $userChatId,
                $this->cache->message('support_message_received', 'پیام شما برای پشتیبانی ارسال شد.'),
            );
        } catch (\Throwable) {
            return true;
        }

        return true;
    }

    /**
     * Staff reply in reports group → deliver to the user private chat.
     *
     * @param array<string, mixed> $message
     */
    public function tryHandleGroupMessage(array $message): bool
    {
        $reportsChat = $this->cache->reportsGroupChatId();
        if ($reportsChat === null || $reportsChat === '') {
            return false;
        }

        $groupChatId = (string) ($message['chat']['id'] ?? '');
        if ($groupChatId === '' || $groupChatId !== (string) $reportsChat) {
            return false;
        }

        if (! empty($message['from']['is_bot'])) {
            return false;
        }

        $replyToId = (int) ($message['reply_to_message']['message_id'] ?? 0);
        $adminMessageId = (int) ($message['message_id'] ?? 0);
        if ($replyToId <= 0 || $adminMessageId <= 0) {
            return false;
        }

        $resolved = $this->resolveUserThread($reportsChat, $replyToId, $message);
        if ($resolved === null) {
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

        $userChatId = $resolved['user_chat_id'];
        $replyToUserMessageId = $resolved['reply_to_user_message_id'];
        $threadId = isset($resolved['thread_id']) ? (int) $resolved['thread_id'] : 0;
        if ($threadId <= 0) {
            $threadId = (int) ($message['message_thread_id'] ?? 0);
        }
        $deliverOptions = ['parse_mode' => 'HTML'];
        if ($replyToUserMessageId > 0) {
            $deliverOptions['reply_to_message_id'] = $replyToUserMessageId;
            $deliverOptions['allow_sending_without_reply'] = true;
        }

        try {
            if ($hasMedia) {
                $delivered = $this->api->copyMessage((int) $userChatId, $groupChatId, $adminMessageId, [
                    ...$deliverOptions,
                    'caption' => $this->formatSupportCaption($text !== '' ? $text : null),
                ]);
            } else {
                try {
                    $delivered = $this->api->sendMessageResult(
                        (int) $userChatId,
                        $this->formatSupportReply($text),
                        $deliverOptions,
                    );
                } catch (\Throwable) {
                    unset($deliverOptions['reply_to_message_id'], $deliverOptions['allow_sending_without_reply']);
                    $delivered = $this->api->sendMessageResult(
                        (int) $userChatId,
                        $this->formatSupportReply($text),
                        $deliverOptions,
                    );
                }
            }

            $deliveredId = (int) ($delivered['message_id'] ?? 0);
            if ($deliveredId <= 0) {
                throw new \RuntimeException('empty_delivery_result');
            }

            $this->storeMap([
                'direction' => 'support_to_user',
                'source_chat_id' => $groupChatId,
                'source_message_id' => $adminMessageId,
                'target_chat_id' => $userChatId,
                'target_message_id' => $deliveredId,
                'target_thread_id' => $threadId > 0 ? $threadId : ($resolved['thread_id'] ?? null),
                'forward_message_id' => $replyToUserMessageId > 0 ? $replyToUserMessageId : null,
            ]);
            $this->reactOnMessage($groupChatId, $adminMessageId, self::CONFIRM_EMOJIS);
        } catch (\Throwable $e) {
            $this->reactOnMessage($groupChatId, $adminMessageId, self::FAIL_EMOJIS);
            $this->notifyDeliveryFailure($groupChatId, $adminMessageId, $threadId, $e);
        }

        return true;
    }

    /**
     * @param array<string, mixed> $message
     * @return array{user_chat_id: string, reply_to_user_message_id: int, thread_id: ?int}|null
     */
    private function resolveUserThread(string $reportsChat, int $replyToId, array $message): ?array
    {
        $map = $this->findMapByTarget($reportsChat, 'user_to_support', $replyToId);
        if ($map === null) {
            $map = $this->findMapByForwardId($reportsChat, $replyToId);
        }

        if ($map !== null) {
            return [
                'user_chat_id' => (string) $map['source_chat_id'],
                'reply_to_user_message_id' => (int) $map['source_message_id'],
                'thread_id' => isset($map['target_thread_id']) ? (int) $map['target_thread_id'] : null,
            ];
        }

        $delivery = $this->findMapBySource($reportsChat, 'support_to_user', $replyToId);
        if ($delivery !== null) {
            $userMsgId = (int) ($delivery['forward_message_id'] ?? 0);

            return [
                'user_chat_id' => (string) $delivery['target_chat_id'],
                'reply_to_user_message_id' => $userMsgId,
                'thread_id' => isset($delivery['target_thread_id']) ? (int) $delivery['target_thread_id'] : null,
            ];
        }

        $replyText = trim((string) ($message['reply_to_message']['text'] ?? ''));
        $userId = $this->extractTelegramUserId($replyText);
        if ($userId === null) {
            return null;
        }

        $latest = $this->findLatestUserToSupport((string) $userId, $reportsChat);
        if ($latest === null) {
            return [
                'user_chat_id' => (string) $userId,
                'reply_to_user_message_id' => 0,
                'thread_id' => null,
            ];
        }

        return [
            'user_chat_id' => (string) $userId,
            'reply_to_user_message_id' => (int) $latest['source_message_id'],
            'thread_id' => isset($latest['target_thread_id']) ? (int) $latest['target_thread_id'] : null,
        ];
    }

    private function formatIdentityMessage(int $telegramUserId, string $hashtag): string
    {
        $account = $this->accounts->get($telegramUserId);
        $name = trim((string) ($account['display_name'] ?? ''));
        if ($name === '') {
            $name = 'کاربر تلگرام';
        }
        $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeTag = htmlspecialchars($hashtag, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return '<b>پشتیبانی 🎫</b>'
            ."\n#{$safeTag}"
            ."\n<b>نام: </b>{$safeName}"
            ."\n<b>شناسه: </b>"
            .'<a href="tg://openmessage?user_id='.$telegramUserId.'">'.$telegramUserId.'</a>';
    }

    /** @param list<string> $emojis */
    private function reactOnMessage(string $chatId, int $messageId, array $emojis): void
    {
        if ($messageId <= 0) {
            return;
        }

        foreach ($emojis as $emoji) {
            try {
                $this->api->setMessageReaction($chatId, $messageId, [
                    ['type' => 'emoji', 'emoji' => $emoji],
                ]);

                return;
            } catch (\Throwable) {
                // Try next emoji — group may restrict which reactions are allowed.
            }
        }
    }

    private function notifyDeliveryFailure(string $groupChatId, int $adminMessageId, int $threadId, \Throwable $error): void
    {
        $reason = $this->humanizeDeliveryError($error->getMessage());
        $body = '❌ <b>پیام به کاربر نرسید</b>'
            ."\n"
            .htmlspecialchars($reason, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $options = [
            'parse_mode' => 'HTML',
            'reply_to_message_id' => $adminMessageId,
            'allow_sending_without_reply' => true,
        ];
        if ($threadId > 0) {
            $options['message_thread_id'] = $threadId;
        }

        try {
            $this->api->sendMessage($groupChatId, $body, $options);
        } catch (\Throwable $e) {
            error_log('[telegram-host] support delivery failure notice: '.$e->getMessage());
        }
    }

    private function humanizeDeliveryError(string $raw): string
    {
        $msg = mb_strtolower($raw);

        if (str_contains($msg, 'blocked by the user') || str_contains($msg, 'bot was blocked')) {
            return 'کاربر ربات را مسدود کرده است.';
        }
        if (str_contains($msg, 'user is deactivated') || str_contains($msg, 'user deactivated')) {
            return 'حساب کاربر در تلگرام غیرفعال شده است.';
        }
        if (str_contains($msg, "can't initiate conversation") || str_contains($msg, 'chat not found')) {
            return 'کاربر ربات را استارت نکرده یا چت خصوصی در دسترس نیست.';
        }
        if (str_contains($msg, 'forbidden')) {
            return 'ارسال به کاربر مجاز نیست (احتمالاً ربات را متوقف کرده).';
        }
        if (str_contains($msg, 'empty_delivery_result')) {
            return 'تلگرام نتیجه ارسال معتبری برنگرداند.';
        }
        if ($raw !== '') {
            return 'خطا: '.$raw;
        }

        return 'ارسال به کاربر ناموفق بود.';
    }

    private function formatSupportReply(string $text): string
    {
        $safe = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        return '<b>🎫 پاسخ پشتیبانی</b>'
            ."\n"
            .'────────────────'
            ."\n"
            .$safe
            ."\n\n"
            .'<i>برای پاسخ، روی همین پیام Reply بزنید.</i>';
    }

    private function formatSupportCaption(?string $text): string
    {
        $header = '<b>🎫 پاسخ پشتیبانی</b>';
        $hint = "\n\n".'<i>برای پاسخ، روی همین پیام Reply بزنید.</i>';
        if ($text === null || $text === '') {
            return $header.$hint;
        }

        return $header."\n".htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').$hint;
    }

    private function extractTelegramUserId(string $text): ?int
    {
        if (preg_match('/tg:\/\/openmessage\?user_id=(\d{5,15})/', $text, $m)) {
            return (int) $m[1];
        }

        if (preg_match('/(?:^|\n)(\d{5,15})\s*$/u', trim($text), $m)) {
            return (int) $m[1];
        }

        if (preg_match('/^(\d{5,15})$/u', trim($text), $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /** @param array{direction: string, source_chat_id: string, source_message_id: int, target_chat_id: string, target_message_id: int, target_thread_id: ?int, forward_message_id: ?int} $row */
    private function storeMap(array $row): void
    {
        $this->ensureTable();
        $stmt = $this->pdo->prepare(
            'INSERT INTO support_message_maps
                (direction, source_chat_id, source_message_id, target_chat_id, target_message_id, target_thread_id, forward_message_id, created_at)
             VALUES
                (:direction, :source_chat_id, :source_message_id, :target_chat_id, :target_message_id, :target_thread_id, :forward_message_id, NOW())',
        );
        $stmt->execute([
            'direction' => $row['direction'],
            'source_chat_id' => $row['source_chat_id'],
            'source_message_id' => $row['source_message_id'],
            'target_chat_id' => $row['target_chat_id'],
            'target_message_id' => $row['target_message_id'],
            'target_thread_id' => $row['target_thread_id'],
            'forward_message_id' => $row['forward_message_id'],
        ]);
    }

    /** @return array<string, mixed>|null */
    private function findMap(string $direction, string $targetChatId, int $targetMessageId): ?array
    {
        $this->ensureTable();
        $stmt = $this->pdo->prepare(
            'SELECT * FROM support_message_maps
             WHERE direction = :direction AND target_chat_id = :chat AND target_message_id = :mid
             ORDER BY id DESC LIMIT 1',
        );
        $stmt->execute([
            'direction' => $direction,
            'chat' => $targetChatId,
            'mid' => $targetMessageId,
        ]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    private function findMapByTarget(string $targetChatId, string $direction, int $targetMessageId): ?array
    {
        return $this->findMap($direction, $targetChatId, $targetMessageId);
    }

    /** @return array<string, mixed>|null */
    private function findMapByForwardId(string $targetChatId, int $forwardMessageId): ?array
    {
        $this->ensureTable();
        $stmt = $this->pdo->prepare(
            'SELECT * FROM support_message_maps
             WHERE direction = \'user_to_support\' AND target_chat_id = :chat AND forward_message_id = :fid
             ORDER BY id DESC LIMIT 1',
        );
        $stmt->execute(['chat' => $targetChatId, 'fid' => $forwardMessageId]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    private function findMapBySource(string $sourceChatId, string $direction, int $sourceMessageId): ?array
    {
        $this->ensureTable();
        $stmt = $this->pdo->prepare(
            'SELECT * FROM support_message_maps
             WHERE direction = :direction AND source_chat_id = :chat AND source_message_id = :mid
             ORDER BY id DESC LIMIT 1',
        );
        $stmt->execute([
            'direction' => $direction,
            'chat' => $sourceChatId,
            'mid' => $sourceMessageId,
        ]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    /** @return array<string, mixed>|null */
    private function findLatestUserToSupport(string $sourceChatId, string $targetChatId): ?array
    {
        $this->ensureTable();
        $stmt = $this->pdo->prepare(
            'SELECT * FROM support_message_maps
             WHERE direction = \'user_to_support\' AND source_chat_id = :source AND target_chat_id = :target
             ORDER BY id DESC LIMIT 1',
        );
        $stmt->execute(['source' => $sourceChatId, 'target' => $targetChatId]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    private function ensureTable(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS support_message_maps (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                direction VARCHAR(32) NOT NULL,
                source_chat_id VARCHAR(64) NOT NULL,
                source_message_id BIGINT NOT NULL,
                target_chat_id VARCHAR(64) NOT NULL,
                target_message_id BIGINT NOT NULL,
                target_thread_id BIGINT NULL,
                forward_message_id BIGINT NULL,
                created_at DATETIME NOT NULL,
                INDEX idx_support_map_target (direction, target_chat_id, target_message_id),
                INDEX idx_support_map_source (direction, source_chat_id, source_message_id),
                INDEX idx_support_map_forward (target_chat_id, forward_message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );
        $ready = true;
    }
}
