<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Cache\HotCache;

/**
 * TTL cache for Telegram getChatMember results (required channels + destinations).
 * Member=true is cached longer; non-member expires quickly so join prompts recover fast.
 */
final class MembershipCheckCache
{
    private const TTL_MEMBER_SECONDS = 600;

    private const TTL_NON_MEMBER_SECONDS = 30;

    public function __construct(
        private readonly \PDO $pdo,
        private readonly ?HotCache $hotCache = null,
    ) {}

    /**
     * @param  callable(): bool  $liveCheck
     */
    public function check(int $telegramUserId, string $chatId, callable $liveCheck): bool
    {
        if ($telegramUserId <= 0 || $chatId === '') {
            return false;
        }

        $cached = $this->read($telegramUserId, $chatId);
        if ($cached !== null) {
            return $cached;
        }

        $isMember = $liveCheck();
        $this->write($telegramUserId, $chatId, $isMember);

        return $isMember;
    }

    /** @param array<string, mixed> $chatMember */
    public function invalidateFromChatMemberUpdate(array $chatMember): void
    {
        $userId = (int) (
            $chatMember['new_chat_member']['user']['id']
            ?? $chatMember['from']['id']
            ?? 0
        );
        $chatId = $this->normalizeChatId($chatMember['chat']['id'] ?? null);
        if ($userId <= 0 || $chatId === '') {
            return;
        }

        $this->invalidate($userId, $chatId);
    }

    public function invalidate(int $telegramUserId, string $chatId): void
    {
        if ($telegramUserId <= 0 || $chatId === '') {
            return;
        }

        $this->hotCache?->invalidateMembership($telegramUserId, $chatId);

        try {
            $stmt = $this->pdo->prepare(
                'DELETE FROM membership_cache WHERE telegram_user_id = :uid AND chat_id = :cid',
            );
            $stmt->execute(['uid' => $telegramUserId, 'cid' => $chatId]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] membership cache invalidate: '.$e->getMessage());
        }
    }

    public function invalidateUser(int $telegramUserId): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        $this->hotCache?->invalidateMembershipUser($telegramUserId);

        try {
            $stmt = $this->pdo->prepare('DELETE FROM membership_cache WHERE telegram_user_id = :uid');
            $stmt->execute(['uid' => $telegramUserId]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] membership cache invalidate user: '.$e->getMessage());
        }
    }

    private function read(int $telegramUserId, string $chatId): ?bool
    {
        $fromRedis = $this->hotCache?->getMembership($telegramUserId, $chatId);
        if ($fromRedis !== null) {
            return $fromRedis;
        }

        try {
            $stmt = $this->pdo->prepare(
                'SELECT is_member, checked_at FROM membership_cache
                 WHERE telegram_user_id = :uid AND chat_id = :cid LIMIT 1',
            );
            $stmt->execute(['uid' => $telegramUserId, 'cid' => $chatId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (! is_array($row)) {
                return null;
            }

            $checkedAt = strtotime((string) ($row['checked_at'] ?? ''));
            if ($checkedAt === false) {
                return null;
            }

            $isMember = (int) ($row['is_member'] ?? 0) === 1;
            $ttl = $isMember ? self::TTL_MEMBER_SECONDS : self::TTL_NON_MEMBER_SECONDS;
            if (time() - $checkedAt > $ttl) {
                return null;
            }

            $this->hotCache?->storeMembership($telegramUserId, $chatId, $isMember, $ttl);

            return $isMember;
        } catch (\Throwable $e) {
            error_log('[telegram-host] membership cache read: '.$e->getMessage());

            return null;
        }
    }

    private function write(int $telegramUserId, string $chatId, bool $isMember): void
    {
        $ttl = $isMember ? self::TTL_MEMBER_SECONDS : self::TTL_NON_MEMBER_SECONDS;
        $this->hotCache?->storeMembership($telegramUserId, $chatId, $isMember, $ttl);

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO membership_cache (telegram_user_id, chat_id, is_member, checked_at)
                 VALUES (:uid, :cid, :member, NOW())
                 ON DUPLICATE KEY UPDATE is_member = VALUES(is_member), checked_at = VALUES(checked_at)',
            );
            $stmt->execute([
                'uid' => $telegramUserId,
                'cid' => $chatId,
                'member' => $isMember ? 1 : 0,
            ]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] membership cache write: '.$e->getMessage());
        }
    }

    private function normalizeChatId(mixed $chatId): string
    {
        if ($chatId === null || $chatId === '') {
            return '';
        }
        if (is_int($chatId) || is_float($chatId)) {
            return sprintf('%.0f', $chatId);
        }

        return trim((string) $chatId);
    }
}
