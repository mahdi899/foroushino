<?php

declare(strict_types=1);

namespace TelegramHost\Cache;

use TelegramHost\Http\SyncClient;
use TelegramHost\Services\WebhookRegisterFromPull;

/**
 * Reads/writes the long-lived cache tables (messages, feature flags,
 * required chats, catalog). Populated by `cron/pull-sync.php`; read
 * synchronously (fast, local MySQL) on every webhook hit.
 */
final class SyncCache
{
    /** @var array<string, bool> */
    private const FEATURE_DEFAULTS = [
        'referral_enabled' => true,
        'collect_phone_and_name' => true,
        'iran_mobile_only' => true,
        'zarinpal_payment' => true,
        'card_to_card_payment' => false,
        'sms_otp_verification' => false,
        'ticket_requires_subscription' => false,
        'support_requires_subscription' => false,
        'checkout_zarinpal' => true,
        'checkout_c2c' => false,
        'bot_is_active' => true,
    ];

    /** @param array<string, mixed>|null $hostConfig */
    public function __construct(
        private readonly \PDO $pdo,
        private readonly SyncClient $sync,
        private readonly ?array $hostConfig = null,
    ) {}

    public function refreshAll(): void
    {
        $bootstrap = $this->sync->call('bootstrap');
        if ($this->hostConfig !== null) {
            (new WebhookRegisterFromPull($this->hostConfig))->processIfRequested($bootstrap, $this->sync);
        }
        $this->storeBootstrapOnly($bootstrap);

        $catalog = $this->sync->call('catalog');
        $this->storeCatalogOnly($catalog);

        $this->touchSyncMeta('full_refresh');
    }

    /** Lighter than refreshAll — only bootstrap (reports group id, messages, flags). */
    public function refreshBootstrap(): void
    {
        $bootstrap = $this->sync->call('bootstrap');
        if ($this->hostConfig !== null) {
            (new WebhookRegisterFromPull($this->hostConfig))->processIfRequested($bootstrap, $this->sync);
        }
        $this->storeBootstrapOnly($bootstrap);
        $this->touchSyncMeta('bootstrap_refresh');
    }

    /** @param array<string, mixed> $bootstrap */
    public function storeBootstrapOnly(array $bootstrap): void
    {
        $messages = (array) ($bootstrap['messages'] ?? []);
        foreach ((array) ($bootstrap['site_urls'] ?? []) as $key => $url) {
            $messages['site_url_'.$key] = (string) $url;
        }

        $this->storeMessages($messages);

        $flags = (array) ($bootstrap['bot']['features'] ?? []);
        $checkout = (array) ($bootstrap['checkout'] ?? []);
        $flags['checkout_zarinpal'] = (bool) ($checkout['zarinpal_enabled'] ?? ($flags['zarinpal_payment'] ?? true));
        $flags['checkout_c2c'] = (bool) ($checkout['c2c_enabled'] ?? ($flags['card_to_card_payment'] ?? false));
        $flags['bot_is_active'] = (bool) ($bootstrap['bot']['is_active'] ?? true);

        // Fill missing flags with Iran-compatible defaults so referral etc. stay visible.
        foreach (self::FEATURE_DEFAULTS as $key => $default) {
            if (! array_key_exists($key, $flags)) {
                $flags[$key] = $default;
            }
        }

        $this->storeFeatureFlags($flags);
        $this->storeRequiredChats((array) ($bootstrap['required_chats'] ?? []));
        $this->storeSupportCategories((array) ($bootstrap['support_categories'] ?? []));
        $revision = trim((string) ($bootstrap['catalog_revision'] ?? ''));
        if ($revision !== '') {
            $this->storeMessages(['__catalog_revision' => $revision]);
        }

        $reportsChat = trim((string) ($bootstrap['bot']['reports_group_chat_id'] ?? ''));
        if ($reportsChat === '' && is_array($this->hostConfig)) {
            $reportsChat = trim((string) ($this->hostConfig['reports_group_chat_id'] ?? ''));
        }
        if ($reportsChat !== '') {
            $this->storeMessages(['__reports_group_chat_id' => $reportsChat]);
        }

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

        if ($value === false) {
            return self::FEATURE_DEFAULTS[$key] ?? false;
        }

        return (int) $value === 1;
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

    public function catalogRevision(): string
    {
        return $this->message('__catalog_revision', '');
    }

    public function secondsSinceRevisionCheck(): int
    {
        $stmt = $this->pdo->prepare('SELECT synced_at FROM sync_meta WHERE sync_key = :key');
        $stmt->execute(['key' => 'revision_check']);
        $value = $stmt->fetchColumn();
        if (! is_string($value) || $value === '') {
            return PHP_INT_MAX;
        }

        return max(0, time() - strtotime($value));
    }

    public function markRevisionChecked(): void
    {
        $this->touchSyncMeta('revision_check');
    }

    public function touchSyncMetaPublic(string $key): void
    {
        $this->touchSyncMeta($key);
    }

    public function checkoutZarinpalEnabled(): bool
    {
        return $this->featureEnabled('checkout_zarinpal');
    }

    public function checkoutC2cEnabled(): bool
    {
        return $this->featureEnabled('checkout_c2c');
    }

    public function siteUrl(string $key, string $fallback = ''): string
    {
        return $this->message('site_url_'.$key, $fallback);
    }

    public function reportsGroupChatId(): ?string
    {
        $value = trim($this->message('__reports_group_chat_id', ''));
        if ($value !== '') {
            return $value;
        }

        if (is_array($this->hostConfig)) {
            $override = trim((string) ($this->hostConfig['reports_group_chat_id'] ?? ''));
            if ($override !== '') {
                return $override;
            }
        }

        return null;
    }

    public function supportTopicId(string $categoryKey): ?int
    {
        $raw = trim($this->message('__support_topic_'.$categoryKey, ''));
        if ($raw === '' || ! ctype_digit($raw)) {
            return null;
        }

        $id = (int) $raw;

        return $id > 0 ? $id : null;
    }

    public function botIsActive(): bool
    {
        $stmt = $this->pdo->prepare('SELECT enabled FROM bot_feature_flags WHERE flag_key = :key');
        $stmt->execute(['key' => 'bot_is_active']);
        $value = $stmt->fetchColumn();

        return $value === false || (int) $value === 1;
    }

    /** @return array<string, mixed>|null */
    public function findProduct(int $productId): ?array
    {
        foreach ($this->courses() as $course) {
            if ((int) $course['id'] === $productId) {
                return $course;
            }
        }

        foreach ($this->seminars() as $seminar) {
            if ((int) ($seminar['product_id'] ?? 0) === $productId) {
                return [
                    'id' => $productId,
                    'title' => $seminar['title'],
                    'price' => $seminar['price'] ?? 0,
                    'sale_price' => $seminar['sale_price'] ?? null,
                    'photo' => $seminar['photo'] ?? null,
                ];
            }
        }

        return null;
    }

    /** @return array<string, mixed>|null */
    public function findProductBySlug(string $slug): ?array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return null;
        }

        foreach ($this->courses() as $course) {
            if ((string) ($course['slug'] ?? '') === $slug) {
                return $course;
            }
        }

        return null;
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

    /** @param list<array<string, mixed>> $categories */
    private function storeSupportCategories(array $categories): void
    {
        $messages = [];
        foreach ($categories as $category) {
            $key = trim((string) ($category['key'] ?? ''));
            if ($key === '') {
                continue;
            }
            $topicId = (int) ($category['default_topic_id'] ?? 0);
            $messages['__support_topic_'.$key] = $topicId > 0 ? (string) $topicId : '';
        }
        if ($messages !== []) {
            $this->storeMessages($messages);
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
            'INSERT INTO catalog_products (id, slug, title, price, sale_price, photo_url, synced_at)
             VALUES (:id, :slug, :title, :price, :sale_price, :photo_url, NOW())',
        );
        foreach ($courses as $course) {
            $courseStmt->execute([
                'id' => (int) $course['id'],
                'slug' => (string) $course['slug'],
                'title' => (string) $course['title'],
                'price' => $course['price'] ?? null,
                'sale_price' => $course['sale_price'] ?? null,
                'photo_url' => $course['photo'] ?? null,
            ]);
        }

        $seminarStmt = $this->pdo->prepare(
            'INSERT INTO catalog_seminars (id, product_id, title, seminar_date, location, capacity_hint, price, sale_price, photo_url, synced_at)
             VALUES (:id, :product_id, :title, :date, :location, :capacity_hint, :price, :sale_price, :photo_url, NOW())',
        );
        foreach ($seminars as $seminar) {
            $seminarStmt->execute([
                'id' => (int) $seminar['id'],
                'product_id' => $seminar['product_id'] ?? null,
                'title' => (string) $seminar['title'],
                'date' => $this->toMysqlDateTime($seminar['date'] ?? null),
                'location' => $seminar['location'] ?? null,
                'capacity_hint' => $seminar['capacity_hint'] ?? null,
                'price' => $seminar['price'] ?? null,
                'sale_price' => $seminar['sale_price'] ?? null,
                'photo_url' => $seminar['photo'] ?? null,
            ]);
        }
    }

    /**
     * Iran sends ISO 8601 datetimes (e.g. "2026-07-24T19:46:00+03:30");
     * MySQL DATETIME columns need "Y-m-d H:i:s" or the INSERT throws.
     */
    private function toMysqlDateTime(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $ts = strtotime($value);

        return $ts !== false ? date('Y-m-d H:i:s', $ts) : null;
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
