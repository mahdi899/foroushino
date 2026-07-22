<?php

declare(strict_types=1);

namespace TelegramHost\Security;

/**
 * Simple fixed-window flood guard for the public webhook endpoint.
 * The host has no Redis, so this uses a tiny MySQL table (see db/schema.sql).
 * Telegram already got its 200 OK before this runs, so on abuse we just
 * drop the update silently — no retries, no reply, no cost to the user.
 */
final class RateLimiter
{
    public function __construct(
        private readonly \PDO $pdo,
        private readonly int $maxPerWindow = 20,
        private readonly int $windowSeconds = 10,
    ) {}

    public function tooManyRequests(int $telegramUserId): bool
    {
        $now = time();
        $windowStart = $now - ($now % $this->windowSeconds);

        $stmt = $this->pdo->prepare(
            'INSERT INTO rate_limits (telegram_user_id, window_start, hits) VALUES (:id, :window, 1)
             ON DUPLICATE KEY UPDATE
                hits = IF(window_start = :window2, hits + 1, 1),
                window_start = :window3',
        );
        $stmt->execute([
            'id' => $telegramUserId,
            'window' => $windowStart,
            'window2' => $windowStart,
            'window3' => $windowStart,
        ]);

        $check = $this->pdo->prepare('SELECT hits FROM rate_limits WHERE telegram_user_id = :id');
        $check->execute(['id' => $telegramUserId]);
        $hits = (int) $check->fetchColumn();

        return $hits > $this->maxPerWindow;
    }
}
