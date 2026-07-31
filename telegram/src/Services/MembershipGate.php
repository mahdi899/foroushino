<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Support\InlineButtons;
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

    public function clearCacheForUser(int $telegramUserId): void
    {
        $this->membershipCache->forgetUser($telegramUserId);
    }

    /** @param array<string, mixed> $chatMember */
    public function invalidateFromChatMemberUpdate(array $chatMember): void
    {
        $userId = (int) ($chatMember['new_chat_member']['user']['id'] ?? 0);
        if ($userId <= 0) {
            return;
        }

        $chatId = (string) ($chatMember['chat']['id'] ?? '');
        if ($chatId !== '') {
            $this->membershipCache->forgetChat($userId, $chatId);
        }

        $newStatus = (string) ($chatMember['new_chat_member']['status'] ?? '');
        if (in_array($newStatus, ['left', 'kicked'], true)) {
            $this->clearCacheForUser($userId);
        }
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
            error_log('[telegram-host] membership getChatMember chat='.$chatId.' user='.$telegramUserId.': '.$e->getMessage());

            return false;
        }
    }
}
