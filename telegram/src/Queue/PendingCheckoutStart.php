<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

/**
 * Queues checkout start (Zarinpal / C2C) for background drain — never blocks the webhook.
 */
final class PendingCheckoutStart
{
    private bool $schemaReady = false;

    public function __construct(private readonly \PDO $pdo) {}

    public function enqueue(
        int $telegramUserId,
        int $chatId,
        int $loadingMessageId,
        string $method,
        int $productId,
        ?string $coupon,
        string $localToken,
    ): void {
        if ($telegramUserId <= 0 || $chatId <= 0 || $productId <= 0) {
            return;
        }

        $method = $method === 'c2c' ? 'c2c' : 'zp';
        $this->ensureSchema();

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO pending_checkout_start (
                    telegram_user_id, chat_id, loading_message_id, method, product_id, coupon, local_token,
                    attempts, created_at, updated_at
                 ) VALUES (
                    :uid, :chat, :msg, :method, :pid, :coupon, :token, 0, NOW(), NOW()
                 )
                 ON DUPLICATE KEY UPDATE
                    chat_id = :chat2,
                    loading_message_id = :msg2,
                    coupon = :coupon2,
                    local_token = :token2,
                    attempts = 0,
                    last_error = NULL,
                    updated_at = NOW()',
            );
            $stmt->execute([
                'uid' => $telegramUserId,
                'chat' => $chatId,
                'msg' => max(0, $loadingMessageId),
                'method' => $method,
                'pid' => $productId,
                'coupon' => $coupon !== null && $coupon !== '' ? $coupon : null,
                'token' => $localToken,
                'chat2' => $chatId,
                'msg2' => max(0, $loadingMessageId),
                'coupon2' => $coupon !== null && $coupon !== '' ? $coupon : null,
                'token2' => $localToken,
            ]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] checkout start queue push: '.$e->getMessage());
        }
    }

    /** @return list<array<string, mixed>> */
    public function popBatch(int $limit = 5): array
    {
        $this->ensureSchema();
        try {
            $stmt = $this->pdo->query(
                'SELECT id, telegram_user_id, chat_id, loading_message_id, method, product_id, coupon, local_token
                 FROM pending_checkout_start
                 ORDER BY updated_at ASC
                 LIMIT '.max(1, min($limit, 20)),
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
                'chat_id' => (int) ($row['chat_id'] ?? 0),
                'loading_message_id' => (int) ($row['loading_message_id'] ?? 0),
                'method' => (string) ($row['method'] ?? 'zp'),
                'product_id' => (int) ($row['product_id'] ?? 0),
                'coupon' => isset($row['coupon']) && $row['coupon'] !== '' ? (string) $row['coupon'] : null,
                'local_token' => (string) ($row['local_token'] ?? ''),
            ];
        }

        return $out;
    }

    public function markFailed(int $id, string $error): void
    {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE pending_checkout_start SET attempts = attempts + 1, last_error = :err, updated_at = NOW() WHERE id = :id',
            );
            $stmt->execute(['id' => $id, 'err' => mb_substr($error, 0, 250)]);
        } catch (\Throwable) {
        }
    }

    public function delete(int $id): void
    {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM pending_checkout_start WHERE id = :id');
            $stmt->execute(['id' => $id]);
        } catch (\Throwable) {
        }
    }

    public function pruneOld(int $maxAttempts = 10): void
    {
        try {
            $this->pdo->exec('DELETE FROM pending_checkout_start WHERE attempts >= '.(int) $maxAttempts);
        } catch (\Throwable) {
        }
    }

    public function countPending(): int
    {
        $this->ensureSchema();
        try {
            return (int) $this->pdo->query('SELECT COUNT(*) FROM pending_checkout_start')->fetchColumn();
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
            'CREATE TABLE IF NOT EXISTS pending_checkout_start (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                telegram_user_id BIGINT NOT NULL,
                chat_id BIGINT NOT NULL,
                loading_message_id BIGINT NOT NULL DEFAULT 0,
                method VARCHAR(8) NOT NULL,
                product_id INT NOT NULL,
                coupon VARCHAR(64) NULL,
                local_token VARCHAR(64) NOT NULL,
                attempts INT NOT NULL DEFAULT 0,
                last_error VARCHAR(255) NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE KEY uniq_pending_checkout_start_user_method_product (telegram_user_id, method, product_id),
                INDEX idx_pending_checkout_start_updated (updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );
        $this->schemaReady = true;
    }
}
