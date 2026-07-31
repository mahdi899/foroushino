<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Support\InlineButtons;
use TelegramHost\Telegram\BotApiClient;

/**
 * Mandatory channel membership — always checked live via Telegram getChatMember.
 * User account data is the only thing cached on this host ({@see AccountCache}).
 */
final class MembershipGate
{
    /** @var list<string> */
    private const MEMBER_STATUSES = ['member', 'administrator', 'creator', 'restricted'];

    public function __construct(
        private readonly \TelegramHost\Cache\SyncCache $cache,
        private readonly BotApiClient $api,
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

    /** Prompt join buttons when required channels are missing; return true if satisfied. */
    public function requireMembership(int $chatId, int $telegramUserId): bool
    {
        if ($this->isSatisfied($telegramUserId)) {
            return true;
        }

        $this->promptJoin($chatId, $telegramUserId);

        return false;
    }

    public function promptJoin(int $chatId, int $telegramUserId): void
    {
        $this->api->sendMessage($chatId, $this->cache->message(
            'membership_required',
            'برای ادامه استفاده از ربات، در کانال‌های اجباری عضو شوید.',
        ), [
            'reply_markup' => $this->joinPromptMarkup($telegramUserId),
        ]);
    }

    /** @param array<string, mixed> $chatMember */
    public function invalidateFromChatMemberUpdate(array $chatMember): void
    {
        // Membership is never cached — join/leave is picked up on the next live check.
    }

    /** @return array<string, mixed> */
    public function joinPromptMarkup(int $telegramUserId): array
    {
        $buttons = [];
        foreach ($this->cache->requiredChats() as $chat) {
            if (empty($chat['is_required'])) {
                continue;
            }

            $chatId = (string) ($chat['chat_id'] ?? '');
            if ($chatId !== '' && $this->isMember($telegramUserId, $chatId)) {
                continue;
            }

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
        try {
            $result = $this->api->getChatMember($chatId, $telegramUserId);
            $status = (string) ($result['status'] ?? '');

            return in_array($status, self::MEMBER_STATUSES, true);
        } catch (\Throwable $e) {
            error_log('[telegram-host] membership getChatMember chat='.$chatId.' user='.$telegramUserId.': '.$e->getMessage());

            return false;
        }
    }
}
