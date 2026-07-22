<?php

declare(strict_types=1);

namespace TelegramHost\Cache;

use TelegramHost\Http\SyncClient;

/**
 * Reads/writes the long-lived cache tables (messages, feature flags,
 * required chats, catalog). Populated by `cron/pull-sync.php`; read
 * synchronously (fast, local MySQL) on every webhook hit.
 */
final class SyncCache
{
    public function __construct(private readonly \PDO $pdo, private readonly SyncClient $sync) {}

    public function refreshAll(): void
    {
        $bootstrap = $this->sync->call('bootstrap');
        $this->storeBootstrapOnly($bootstrap);

        $catalog = $this->sync->call('catalog');
        $this->storeCatalogOnly($catalog);

        $this->touchSyncMeta('full_refresh');
    }

    /** @param array<string, mixed> $bootstrap */
    public function storeBootstrapOnly(array $bootstrap): void
    {
        $this->storeMessages((array) ($bootstrap['messages'] ?? []));
        $this->storeFeatureFlags((array) ($bootstrap['bot']['features'] ?? []));
        $this->storeRequiredChats((array) ($bootstrap['required_chats'] ?? []));
        $this->touchSyncMeta('bootstrap');
    }

    /** @param array<string, mixed> $catalog */
    public function storeCatalogOnly(array $catalog): void
    {
        $this->storeCatalog((array) ($catalog['courses'] ?? []), (array) ($catalog['seminars'] ?? []));
        $this->touchSyncMeta('catalog');
    }

    public function message(string $key, string $fallback = ''): string
    {
        $stmt = $this->pdo->prepare('SELECT body FROM bot_messages WHERE message_key = :key');
        $stmt->execute(['key' => $key]);
        $body = $stmt->fetchColumn();

        return is_string($body) && $body !== '' ? $body : $fallback;
    }

    public function featureEnabled(string $key): bool
    {
        $stmt = $this->pdo->prepare('SELECT enabled FROM bot_feature_flags WHERE flag_key = :key');
        $stmt->execute(['key' => $key]);
        $value = $stmt->fetchColumn();

        return $value !== false && (int) $value === 1;
    }

    /** @return list<array<string, mixed>> */
    public function requiredChats(): array
    {
        return $this->pdo->query('SELECT * FROM required_chats WHERE is_required = 1')->fetchAll();
    }

    /** @return list<array<string, mixed>> */
    public function courses(): array
    {
        return $this->pdo->query('SELECT * FROM catalog_products ORDER BY id DESC')->fetchAll();
    }

    /** @return list<array<string, mixed>> */
    public function seminars(): array
    {
        return $this->pdo->query('SELECT * FROM catalog_seminars ORDER BY seminar_date ASC')->fetchAll();
    }

    public function lastSyncedAt(): ?string
    {
        $stmt = $this->pdo->prepare('SELECT synced_at FROM sync_meta WHERE sync_key = :key');
        $stmt->execute(['key' => 'full_refresh']);
        $value = $stmt->fetchColumn();

        return is_string($value) ? $value : null;
    }

    /** @param array<string, string> $messages */
    private function storeMessages(array $messages): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO bot_messages (message_key, body, updated_at) VALUES (:key, :body, NOW())
             ON DUPLICATE KEY UPDATE body = :body2, updated_at = NOW()',
        );

        foreach ($messages as $key => $body) {
            $stmt->execute(['key' => $key, 'body' => (string) $body, 'body2' => (string) $body]);
        }
    }

    /** @param array<string, bool> $flags */
    private function storeFeatureFlags(array $flags): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO bot_feature_flags (flag_key, enabled, updated_at) VALUES (:key, :enabled, NOW())
             ON DUPLICATE KEY UPDATE enabled = :enabled2, updated_at = NOW()',
        );

        foreach ($flags as $key => $enabled) {
            $value = $enabled ? 1 : 0;
            $stmt->execute(['key' => $key, 'enabled' => $value, 'enabled2' => $value]);
        }
    }

    /** @param list<array<string, mixed>> $chats */
    private function storeRequiredChats(array $chats): void
    {
        $this->pdo->exec('DELETE FROM required_chats');
        $stmt = $this->pdo->prepare(
            'INSERT INTO required_chats (id, chat_id, title, invite_link, is_required, updated_at)
             VALUES (:id, :chat_id, :title, :invite_link, :is_required, NOW())',
        );

        foreach ($chats as $chat) {
            $stmt->execute([
                'id' => (int) $chat['id'],
                'chat_id' => (string) $chat['chat_id'],
                'title' => $chat['title'] ?? null,
                'invite_link' => $chat['invite_link'] ?? null,
                'is_required' => ! empty($chat['is_required']) ? 1 : 0,
            ]);
        }
    }

    /**
     * @param list<array<string, mixed>> $courses
     * @param list<array<string, mixed>> $seminars
     */
    private function storeCatalog(array $courses, array $seminars): void
    {
        $this->pdo->exec('DELETE FROM catalog_products');
        $this->pdo->exec('DELETE FROM catalog_seminars');

        $courseStmt = $this->pdo->prepare(
            'INSERT INTO catalog_products (id, slug, title, price, sale_price, synced_at) VALUES (:id, :slug, :title, :price, :sale_price, NOW())',
        );
        foreach ($courses as $course) {
            $courseStmt->execute([
                'id' => (int) $course['id'],
                'slug' => (string) $course['slug'],
                'title' => (string) $course['title'],
                'price' => $course['price'] ?? null,
                'sale_price' => $course['sale_price'] ?? null,
            ]);
        }

        $seminarStmt = $this->pdo->prepare(
            'INSERT INTO catalog_seminars (id, product_id, title, seminar_date, location, capacity_hint, synced_at)
             VALUES (:id, :product_id, :title, :date, :location, :capacity_hint, NOW())',
        );
        foreach ($seminars as $seminar) {
            $seminarStmt->execute([
                'id' => (int) $seminar['id'],
                'product_id' => $seminar['product_id'] ?? null,
                'title' => (string) $seminar['title'],
                'date' => $seminar['date'] ?? null,
                'location' => $seminar['location'] ?? null,
                'capacity_hint' => $seminar['capacity_hint'] ?? null,
            ]);
        }
    }

    private function touchSyncMeta(string $key): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO sync_meta (sync_key, synced_at) VALUES (:key, NOW())
             ON DUPLICATE KEY UPDATE synced_at = NOW()',
        );
        $stmt->execute(['key' => $key]);
    }
}
