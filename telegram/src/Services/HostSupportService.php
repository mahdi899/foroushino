<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Telegram\BotApiClient;

/**
 * Support tickets run entirely on the foreign host:
 * user message → reports group (forward + identity) → staff reply → user.
 * No Iran round-trip required.
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

    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly ConversationRepository $conversations,
        private readonly AccountCache $accounts,
        private readonly MainMenu $mainMenu,
        private readonly \PDO $pdo,
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
     * Reads the cached reports group chat id and, if it's still empty (e.g.
     * a fresh install that never got a bootstrap push yet), tries a single
     * bootstrap refresh from Iran before giving up. Cheap even when Iran is
     * down: SyncClient fails fast once the circuit is open, no timeout wait.
     */
    private function refreshedReportsGroupChatId(): ?string
    {
        $reportsChat = $this->cache->reportsGroupChatId();
        if ($reportsChat !== null && $reportsChat !== '') {
            return $reportsChat;
        }

        try {
            $this->cache->refreshAll();
        } catch (\Throwable $e) {
            error_log('[telegram-host] support bootstrap refresh failed: '.$e->getMessage());

            return null;
        }

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
        if (! isset(self::CATEGORY_LABELS[$category])) {
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

        $topicId = $this->cache->supportTopicId($category);
        $forwardOptions = [];
        if ($topicId !== null && $topicId > 0) {
            $forwardOptions['message_thread_id'] = $topicId;
        }

        try {
            $forwarded = $this->api->forwardMessage($reportsChat, $chatId, $sourceMessageId, $forwardOptions);
            $forwardMessageId = (int) ($forwarded['message_id'] ?? 0);
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
        } catch (\Throwable $e) {
            error_log('[telegram-host] support forward failed (category='.$category.', user='.$telegramUserId.'): '.$e->getMessage());
            $this->api->sendMessage($chatId, 'ارسال پیام پشتیبانی ناموفق بود. لطفاً دوباره تلاش کنید.');

            return;
        }

        // Leave support mode after one message — menu works again immediately.
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
        if ($ackId > 0 && isset($idMessageId) && $idMessageId > 0) {
            $this->storeMap([
                'direction' => 'support_to_user',
                'source_chat_id' => (string) $reportsChat,
                'source_message_id' => $idMessageId,
                'target_chat_id' => (string) $chatId,
                'target_message_id' => $ackId,
                'target_thread_id' => $topicId ?? null,
                'forward_message_id' => $sourceMessageId,
            ]);
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
            if ($deliveredId > 0) {
                $this->storeMap([
                    'direction' => 'support_to_user',
                    'source_chat_id' => $groupChatId,
                    'source_message_id' => $adminMessageId,
                    'target_chat_id' => $userChatId,
                    'target_message_id' => $deliveredId,
                    'target_thread_id' => $resolved['thread_id'] ?? null,
                    'forward_message_id' => $replyToUserMessageId > 0 ? $replyToUserMessageId : null,
                ]);
            }
        } catch (\Throwable) {
            return true;
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
