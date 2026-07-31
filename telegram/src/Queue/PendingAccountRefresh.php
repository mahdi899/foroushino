<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

/** Deferred per-user account refresh (hybrid cache — hot/cold scopes). */
final class PendingAccountRefresh
{
    private bool $schemaReady = false;

    public function __construct(private readonly \PDO $pdo) {}

    public function enqueue(int $telegramUserId, string $scope, string $reason = ''): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        $scope = in_array($scope, ['hot', 'cold', 'full'], true) ? $scope : 'hot';
        $this->ensureSchema();

        try {
            $json = json_encode([
                'scope' => $scope,
                'reason' => mb_substr(trim($reason), 0, 64),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                return;
            }

            $stmt = $this->pdo->prepare(
                'INSERT INTO pending_account_refresh (telegram_user_id, payload_json, attempts, created_at, updated_at)
                 VALUES (:uid, :json, 0, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE payload_json = :json2, attempts = 0, last_error = NULL, updated_at = NOW()',
            );
            $stmt->execute([
                'uid' => $telegramUserId,
                'json' => $json,
                'json2' => $json,
            ]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] account refresh queue push: '.$e->getMessage());
        }
    }

    /** @return list<array{id: int, telegram_user_id: int, scope: string, reason: string}> */
    public function popBatch(int $limit = 5): array
    {
        $this->ensureSchema();
        try {
            $stmt = $this->pdo->query(
                'SELECT id, telegram_user_id, payload_json FROM pending_account_refresh ORDER BY updated_at ASC LIMIT '
                .max(1, min($limit, 20)),
            );
            $rows = $stmt->fetchAll();
        } catch (\Throwable) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            $decoded = json_decode((string) ($row['payload_json'] ?? ''), true);
            if (! is_array($decoded)) {
                $this->delete((int) $row['id']);

                continue;
            }
            $out[] = [
                'id' => (int) $row['id'],
                'telegram_user_id' => (int) ($row['telegram_user_id'] ?? 0),
                'scope' => (string) ($decoded['scope'] ?? 'hot'),
                'reason' => (string) ($decoded['reason'] ?? ''),
            ];
        }

        return $out;
    }

    public function markFailed(int $id, string $error): void
    {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE pending_account_refresh SET attempts = attempts + 1, last_error = :err, updated_at = NOW() WHERE id = :id',
            );
            $stmt->execute(['id' => $id, 'err' => mb_substr($error, 0, 250)]);
        } catch (\Throwable) {
        }
    }

    public function delete(int $id): void
    {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM pending_account_refresh WHERE id = :id');
            $stmt->execute(['id' => $id]);
        } catch (\Throwable) {
        }
    }

    public function countPending(): int
    {
        $this->ensureSchema();
        try {
            return (int) $this->pdo->query('SELECT COUNT(*) FROM pending_account_refresh')->fetchColumn();
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
            'CREATE TABLE IF NOT EXISTS pending_account_refresh (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                telegram_user_id BIGINT NOT NULL,
                payload_json VARCHAR(255) NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                last_error VARCHAR(255) NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE KEY uniq_pending_account_refresh_user (telegram_user_id),
                INDEX idx_pending_account_refresh_updated (updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );
        $this->schemaReady = true;
    }
}
