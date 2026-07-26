<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

/** Stores Telegram updates for async relay to Iran — never blocks the webhook UI path. */
final class IranUpdateQueue
{
    public function __construct(private readonly \PDO $pdo) {}

    /** @param array<string, mixed> $update */
    public function push(array $update): void
    {
        try {
            $json = json_encode($update, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                return;
            }

            $stmt = $this->pdo->prepare(
                'INSERT INTO pending_iran_updates (update_json, attempts, created_at, updated_at)
                 VALUES (:json, 0, NOW(), NOW())',
            );
            $stmt->execute(['json' => $json]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] iran queue push: '.$e->getMessage());
        }
    }

    /** @return list<array{id: int, update: array<string, mixed>}> */
    public function popBatch(int $limit): array
    {
        try {
            $stmt = $this->pdo->query(
                'SELECT id, update_json FROM pending_iran_updates ORDER BY id ASC LIMIT '.max(1, min($limit, 10)),
            );
            $rows = $stmt->fetchAll();
        } catch (\Throwable) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            $decoded = json_decode((string) ($row['update_json'] ?? ''), true);
            if (! is_array($decoded)) {
                $this->delete((int) $row['id']);

                continue;
            }
            $out[] = ['id' => (int) $row['id'], 'update' => $decoded];
        }

        return $out;
    }

    public function markFailed(int $id, string $error): void
    {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE pending_iran_updates SET attempts = attempts + 1, last_error = :err, updated_at = NOW() WHERE id = :id',
            );
            $stmt->execute(['id' => $id, 'err' => mb_substr($error, 0, 250)]);
        } catch (\Throwable) {
        }
    }

    public function delete(int $id): void
    {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM pending_iran_updates WHERE id = :id');
            $stmt->execute(['id' => $id]);
        } catch (\Throwable) {
        }
    }

    public function pruneOld(int $maxAttempts = 20): void
    {
        try {
            $this->pdo->exec('DELETE FROM pending_iran_updates WHERE attempts >= '.(int) $maxAttempts);
        } catch (\Throwable) {
        }
    }
}
