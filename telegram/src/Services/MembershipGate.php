<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

final class MembershipGate
{
    /** @var list<string> */
    private const MEMBER_STATUSES = ['member', 'administrator', 'creator', 'restricted'];

    public function __construct(
        private readonly \TelegramHost\Cache\SyncCache $cache,
        private readonly BotApiClient $api,
        private readonly MembershipCheckCache $membershipCache,
    ) {}

    public function isSatisfied(int $telegramUserId): bool
    {
        foreach ($this->cache->requiredChats() as $chat) {
            if (empty($chat['is_required'])) {
                continue;
            }

            $chatId = (string) $chat['chat_id'];
            if (! $this->isMember($telegramUserId, $chatId)) {
                return false;
            }
        }

        return true;
    }

    public function clearCacheForUser(int $telegramUserId): void
    {
        $this->membershipCache->forgetUser($telegramUserId);
    }

    /** @return array<string, mixed> */
    public function joinPromptMarkup(): array
    {
        $buttons = [];
        foreach ($this->cache->requiredChats() as $chat) {
            $url = (string) ($chat['invite_link'] ?? '');
            if ($url === '') {
                continue;
            }
            $buttons[] = [InlineButtons::url((string) ($chat['title'] ?? 'عضویت'), $url, 'channel')];
        }

        $buttons[] = [InlineButtons::membershipRecheck()];

        return ['inline_keyboard' => $buttons];
    }

    private function isMember(int $telegramUserId, string $chatId): bool
    {
        $cached = $this->membershipCache->get($telegramUserId, $chatId);
        if ($cached !== null) {
            return $cached;
        }

        try {
            $result = $this->api->getChatMember($chatId, $telegramUserId);
            $status = (string) ($result['status'] ?? '');
            $isMember = in_array($status, self::MEMBER_STATUSES, true);
            $this->membershipCache->remember($telegramUserId, $chatId, $isMember);

            return $isMember;
        } catch (\Throwable $e) {
            // #region agent log
            @file_put_contents('c:\\Users\\Msi\\Desktop\\foroushino\\debug-e2b7b2.log', json_encode(['sessionId' => 'e2b7b2', 'hypothesisId' => 'R5', 'location' => 'MembershipGate.php:isMember', 'message' => 'membership_api_error_treated_as_non_member', 'data' => ['telegramUserId' => $telegramUserId, 'chatId' => $chatId, 'errorClass' => $e::class, 'cachedFalse' => false], 'timestamp' => (int) (microtime(true) * 1000), 'runId' => 'non-c2c'], JSON_UNESCAPED_UNICODE)."\n", FILE_APPEND);
            // #endregion
            return false;
        }
    }
}
