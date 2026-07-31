<?php

declare(strict_types=1);

namespace TelegramHost\Services;

/** Caches Telegram getChatMember results — avoids slow API on every menu tap. */
final class MembershipCheckCache
{
    public function __construct(
        private readonly \PDO $pdo,
        private readonly int $ttlSeconds = 900,
    ) {}

    public function remember(int $telegramUserId, string $chatId, bool $isMember): void
    {
        try {
            $stmt = $this->pdo->prepare(
            'INSERT INTO membership_cache (telegram_user_id, chat_id, is_member, checked_at)
             VALUES (:uid, :chat, :member, NOW())
             ON DUPLICATE KEY UPDATE is_member = :member2, checked_at = NOW()',
        );
        $flag = $isMember ? 1 : 0;
        $stmt->execute([
            'uid' => $telegramUserId,
            'chat' => $chatId,
            'member' => $flag,
            'member2' => $flag,
        ]);
        } catch (\Throwable) {
            // Table may be missing on older installs — membership still works via live API.
        }
    }

    public function get(int $telegramUserId, string $chatId): ?bool
    {
        try {
            $stmt = $this->pdo->prepare(
            'SELECT is_member, checked_at FROM membership_cache
             WHERE telegram_user_id = :uid AND chat_id = :chat',
        );
        $stmt->execute(['uid' => $telegramUserId, 'chat' => $chatId]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }

        $checkedAt = strtotime((string) ($row['checked_at'] ?? ''));
        if ($checkedAt === false || (time() - $checkedAt) > $this->ttlSeconds) {
            return null;
        }

        return (int) ($row['is_member'] ?? 0) === 1;
        } catch (\Throwable) {
            return null;
        }
    }

    public function forgetUser(int $telegramUserId): void
    {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM membership_cache WHERE telegram_user_id = :uid');
            $stmt->execute(['uid' => $telegramUserId]);
        } catch (\Throwable) {
        }
    }

    public function forgetChat(int $telegramUserId, string $chatId): void
    {
        try {
            $stmt = $this->pdo->prepare(
                'DELETE FROM membership_cache WHERE telegram_user_id = :uid AND chat_id = :chat',
            );
            $stmt->execute(['uid' => $telegramUserId, 'chat' => $chatId]);
        } catch (\Throwable) {
        }
    }
}
