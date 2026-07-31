<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

/**
 * Queues reports-group forward work so the user webhook can ack instantly.
 */
final class PendingSupportForward
{
    private bool $schemaReady = false;

    public function __construct(private readonly \PDO $pdo) {}

    /** @param array<string, mixed> $payload */
    public function push(array $payload): void
    {
        $this->ensureSchema();
        try {
            $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                return;
            }
            $stmt = $this->pdo->prepare(
                'INSERT INTO pending_support_forward (payload_json, attempts, created_at, updated_at)
                 VALUES (:json, 0, NOW(), NOW())',
            );
            $stmt->execute(['json' => $json]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] support forward queue push: '.$e->getMessage());
        }
    }

    /** @return list<array{id: int, payload: array<string, mixed>}> */
    public function popBatch(int $limit = 5): array
    {
        $this->ensureSchema();
        try {
            $stmt = $this->pdo->query(
                'SELECT id, payload_json FROM pending_support_forward ORDER BY id ASC LIMIT '.max(1, min($limit, 10)),
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
            $out[] = ['id' => (int) $row['id'], 'payload' => $decoded];
        }

        return $out;
    }

    public function markFailed(int $id, string $error): void
    {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE pending_support_forward SET attempts = attempts + 1, last_error = :err, updated_at = NOW() WHERE id = :id',
            );
            $stmt->execute(['id' => $id, 'err' => mb_substr($error, 0, 250)]);
        } catch (\Throwable) {
        }
    }

    public function delete(int $id): void
    {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM pending_support_forward WHERE id = :id');
            $stmt->execute(['id' => $id]);
        } catch (\Throwable) {
        }
    }

    public function pruneOld(int $maxAttempts = 20): void
    {
        try {
            $this->pdo->exec('DELETE FROM pending_support_forward WHERE attempts >= '.(int) $maxAttempts);
        } catch (\Throwable) {
        }
    }

    public function countPending(): int
    {
        $this->ensureSchema();
        try {
            return (int) $this->pdo->query('SELECT COUNT(*) FROM pending_support_forward')->fetchColumn();
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
            'CREATE TABLE IF NOT EXISTS pending_support_forward (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                payload_json MEDIUMTEXT NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                last_error VARCHAR(255) NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_pending_support_fwd_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );
        $this->schemaReady = true;
    }
}
