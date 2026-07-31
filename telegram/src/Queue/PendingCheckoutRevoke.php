<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

/**
 * Queues checkout/revoke-open calls for background drain — never blocks the webhook.
 */
final class PendingCheckoutRevoke
{
    private bool $schemaReady = false;

    public function __construct(private readonly \PDO $pdo) {}

    public function enqueue(int $telegramUserId): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        $this->ensureSchema();

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO pending_checkout_revoke (telegram_user_id, attempts, created_at, updated_at)
                 VALUES (:uid, 0, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE attempts = 0, last_error = NULL, updated_at = NOW()',
            );
            $stmt->execute(['uid' => $telegramUserId]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] checkout revoke queue push: '.$e->getMessage());
        }
    }

    /** @return list<array{id: int, telegram_user_id: int}> */
    public function popBatch(int $limit = 5): array
    {
        $this->ensureSchema();
        try {
            $stmt = $this->pdo->query(
                'SELECT id, telegram_user_id FROM pending_checkout_revoke ORDER BY updated_at ASC LIMIT '
                .max(1, min($limit, 20)),
            );
            $rows = $stmt->fetchAll();
        } catch (\Throwable) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'id' => (int) $row['id'],
                'telegram_user_id' => (int) ($row['telegram_user_id'] ?? 0),
            ];
        }

        return $out;
    }

    public function markFailed(int $id, string $error): void
    {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE pending_checkout_revoke SET attempts = attempts + 1, last_error = :err, updated_at = NOW() WHERE id = :id',
            );
            $stmt->execute(['id' => $id, 'err' => mb_substr($error, 0, 250)]);
        } catch (\Throwable) {
        }
    }

    public function delete(int $id): void
    {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM pending_checkout_revoke WHERE id = :id');
            $stmt->execute(['id' => $id]);
        } catch (\Throwable) {
        }
    }

    public function pruneOld(int $maxAttempts = 10): void
    {
        try {
            $this->pdo->exec('DELETE FROM pending_checkout_revoke WHERE attempts >= '.(int) $maxAttempts);
        } catch (\Throwable) {
        }
    }

    public function countPending(): int
    {
        $this->ensureSchema();
        try {
            return (int) $this->pdo->query('SELECT COUNT(*) FROM pending_checkout_revoke')->fetchColumn();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function ensureSchema(): void
    {
        if ($this->schemaReady) {
            return;
        }

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS pending_checkout_revoke (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                telegram_user_id BIGINT NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                last_error VARCHAR(255) NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE KEY uniq_pending_checkout_revoke_user (telegram_user_id),
                INDEX idx_pending_checkout_revoke_updated (updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );
        $this->schemaReady = true;
    }
}
