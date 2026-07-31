<?php

declare(strict_types=1);

namespace TelegramHost\Security;

/**
 * Fixed-window flood guard for the public webhook endpoint.
 * The host has no Redis, so this uses a tiny MySQL table (see db/schema.sql).
 *
 * Rules: 20 updates / 30s → silence for 5 minutes with a user-facing notice.
 */
final class RateLimiter
{
    private const BLOCK_SECONDS = 300;

    private const NOTICE_COOLDOWN_SECONDS = 10;

    private bool $schemaReady = false;

    public function __construct(
        private readonly \PDO $pdo,
        private readonly int $maxPerWindow = 20,
        private readonly int $windowSeconds = 30,
    ) {}

    /**
     * @return array{limited: bool, should_notify: bool, blocked_until: int}
     */
    public function check(int $telegramUserId): array
    {
        $this->ensureSchema();
        $now = time();

        $row = $this->fetchRow($telegramUserId);
        $blockedUntil = (int) ($row['blocked_until'] ?? 0);
        $lastNoticeAt = (int) ($row['last_notice_at'] ?? 0);

        if ($blockedUntil > $now) {
            $shouldNotify = ($now - $lastNoticeAt) >= self::NOTICE_COOLDOWN_SECONDS;
            if ($shouldNotify) {
                $this->touchNotice($telegramUserId, $now);
            }

            return [
                'limited' => true,
                'should_notify' => $shouldNotify,
                'blocked_until' => $blockedUntil,
            ];
        }

        $windowStart = $now - ($now % $this->windowSeconds);

        $stmt = $this->pdo->prepare(
            'INSERT INTO rate_limits (telegram_user_id, window_start, hits, blocked_until, last_notice_at)
             VALUES (:id, :window, 1, 0, 0)
             ON DUPLICATE KEY UPDATE
                hits = IF(window_start = :window2, hits + 1, 1),
                window_start = :window3,
                blocked_until = IF(blocked_until > :now_clear, blocked_until, 0)',
        );
        $stmt->execute([
            'id' => $telegramUserId,
            'window' => $windowStart,
            'window2' => $windowStart,
            'window3' => $windowStart,
            'now_clear' => $now,
        ]);

        $hits = (int) ($this->fetchRow($telegramUserId)['hits'] ?? 0);
        if ($hits <= $this->maxPerWindow) {
            return [
                'limited' => false,
                'should_notify' => false,
                'blocked_until' => 0,
            ];
        }

        $newBlockedUntil = $now + self::BLOCK_SECONDS;
        $block = $this->pdo->prepare(
            'UPDATE rate_limits
             SET blocked_until = :until, last_notice_at = :notice, hits = 0, window_start = :window
             WHERE telegram_user_id = :id',
        );
        $block->execute([
            'until' => $newBlockedUntil,
            'notice' => $now,
            'window' => $windowStart,
            'id' => $telegramUserId,
        ]);

        return [
            'limited' => true,
            'should_notify' => true,
            'blocked_until' => $newBlockedUntil,
        ];
    }

    /** @deprecated Use check() */
    public function tooManyRequests(int $telegramUserId): bool
    {
        return $this->check($telegramUserId)['limited'];
    }

    /** @return array{hits?: int|string, window_start?: int|string, blocked_until?: int|string, last_notice_at?: int|string}|null */
    private function fetchRow(int $telegramUserId): ?array
    {
        $check = $this->pdo->prepare(
            'SELECT hits, window_start, blocked_until, last_notice_at FROM rate_limits WHERE telegram_user_id = :id',
        );
        $check->execute(['id' => $telegramUserId]);
        $row = $check->fetch(\PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    private function touchNotice(int $telegramUserId, int $now): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE rate_limits SET last_notice_at = :notice WHERE telegram_user_id = :id',
        );
        $stmt->execute([
            'notice' => $now,
            'id' => $telegramUserId,
        ]);
    }

    private function ensureSchema(): void
    {
        if ($this->schemaReady) {
            return;
        }

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS rate_limits (
                telegram_user_id BIGINT NOT NULL PRIMARY KEY,
                window_start INT NOT NULL,
                hits INT NOT NULL DEFAULT 1,
                blocked_until INT NOT NULL DEFAULT 0,
                last_notice_at INT NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );

        // Upgrade older host installs that only had window_start/hits.
        $columns = $this->pdo->query('SHOW COLUMNS FROM rate_limits')->fetchAll(\PDO::FETCH_COLUMN);
        $existing = is_array($columns) ? array_map('strval', $columns) : [];
        if (! in_array('blocked_until', $existing, true)) {
            $this->pdo->exec('ALTER TABLE rate_limits ADD COLUMN blocked_until INT NOT NULL DEFAULT 0');
        }
        if (! in_array('last_notice_at', $existing, true)) {
            $this->pdo->exec('ALTER TABLE rate_limits ADD COLUMN last_notice_at INT NOT NULL DEFAULT 0');
        }

        $this->schemaReady = true;
    }
}
