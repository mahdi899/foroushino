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
        $this->storeDestinations((array) ($bootstrap['destinations'] ?? []));
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

        $permanentAdminIds = array_values(array_filter(array_map(
            'intval',
            (array) ($bootstrap['bot']['permanent_admin_user_ids'] ?? []),
        )));
        $this->storeMessages([
            '__permanent_admin_user_ids' => json_encode($permanentAdminIds, JSON_UNESCAPED_UNICODE),
        ]);

        $this->touchSyncMeta('bootstrap');
    }

    /** @param array<string, mixed> $catalog */
    public function storeCatalogOnly(array $catalog): void
    {
        $courses = (array) ($catalog['courses'] ?? []);
        $referenceChannels = (array) ($catalog['reference_channels'] ?? []);
        foreach ($referenceChannels as $channel) {
            $productId = (int) ($channel['product_id'] ?? $channel['id'] ?? 0);
            if ($productId <= 0) {
                continue;
            }
            $courses[] = [
                'id' => $productId,
                'slug' => (string) ($channel['slug'] ?? ''),
                'title' => (string) ($channel['title'] ?? ''),
                'price' => $channel['price'] ?? null,
                'sale_price' => $channel['sale_price'] ?? null,
                'photo' => $channel['photo'] ?? null,
                'product_type' => 'reference_channel',
                'description' => (string) ($channel['description'] ?? ''),
            ];
        }

        $this->storeCatalog($courses, (array) ($catalog['seminars'] ?? []));
        $this->storeReferenceChannelMeta($referenceChannels);
        $this->storeDiscountCodes((array) ($catalog['discount_codes'] ?? []));
        if (array_key_exists('destinations', $catalog)) {
            $this->storeDestinations((array) ($catalog['destinations'] ?? []));
        }
        $this->touchSyncMeta('catalog');
    }

    /** @return array<string, mixed>|null */
    public function findDiscountCode(string $normalizedCode): ?array
    {
        $this->ensureDiscountSchema();
        $stmt = $this->pdo->prepare('SELECT * FROM discount_codes_cache WHERE code = :code LIMIT 1');
        $stmt->execute(['code' => strtoupper(trim($normalizedCode))]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return is_array($row) ? $row : null;
    }

    /** @return list<array<string, mixed>> */
    public function destinations(): array
    {
        $this->ensureDestinationsSchema();
        try {
            $rows = $this->pdo->query(
                'SELECT * FROM destinations_cache ORDER BY id ASC',
            )->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $productIds = json_decode((string) ($row['product_ids_json'] ?? '[]'), true);
            $productTitles = json_decode((string) ($row['product_titles_json'] ?? '[]'), true);
            $out[] = [
                'id' => (int) ($row['id'] ?? 0),
                'title' => (string) ($row['title'] ?? ''),
                'chat_id' => (string) ($row['chat_id'] ?? ''),
                'invite_mode' => (string) ($row['invite_mode'] ?? 'shared'),
                'shared_invite_url' => $row['shared_invite_url'] !== null && $row['shared_invite_url'] !== ''
                    ? (string) $row['shared_invite_url']
                    : null,
                'product_ids' => is_array($productIds)
                    ? array_values(array_map('intval', $productIds))
                    : [],
                'product_titles' => is_array($productTitles)
                    ? array_values(array_map('strval', $productTitles))
                    : [],
                'sat_membership' => ! empty($row['sat_membership']),
            ];
        }

        return $out;
    }

    /** @param list<array<string, mixed>> $destinations */
    private function storeDestinations(array $destinations): void
    {
        $this->ensureDestinationsSchema();
        $this->pdo->exec('DELETE FROM destinations_cache');
        if ($destinations === []) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO destinations_cache (
                id, title, chat_id, invite_mode, shared_invite_url,
                product_ids_json, product_titles_json, sat_membership, synced_at
             ) VALUES (
                :id, :title, :chat_id, :invite_mode, :shared_url,
                :product_ids, :product_titles, :sat_membership, NOW()
             )',
        );

        foreach ($destinations as $destination) {
            $id = (int) ($destination['id'] ?? 0);
            if ($id <= 0) {
                continue;
            }
            $stmt->execute([
                'id' => $id,
                'title' => (string) ($destination['title'] ?? ''),
                'chat_id' => (string) ($destination['chat_id'] ?? ''),
                'invite_mode' => (string) ($destination['invite_mode'] ?? 'shared'),
                'shared_url' => $destination['shared_invite_url'] ?? null,
                'product_ids' => json_encode(array_values(array_map('intval', (array) ($destination['product_ids'] ?? []))), JSON_UNESCAPED_UNICODE),
                'product_titles' => json_encode(array_values(array_map('strval', (array) ($destination['product_titles'] ?? []))), JSON_UNESCAPED_UNICODE),
                'sat_membership' => ! empty($destination['sat_membership']) ? 1 : 0,
            ]);
        }
    }

    private function ensureDestinationsSchema(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS destinations_cache (
                id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
                title VARCHAR(255) NOT NULL DEFAULT \'\',
                chat_id VARCHAR(64) NOT NULL DEFAULT \'\',
                invite_mode VARCHAR(32) NOT NULL DEFAULT \'shared\',
                shared_invite_url TEXT NULL,
                product_ids_json TEXT NULL,
                product_titles_json TEXT NULL,
                sat_membership TINYINT(1) NOT NULL DEFAULT 0,
                synced_at DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );
        $ready = true;
    }

    /** @param list<array<string, mixed>> $codes */
    private function storeDiscountCodes(array $codes): void
    {
        $this->ensureDiscountSchema();
        $this->pdo->exec('DELETE FROM discount_codes_cache');
        if ($codes === []) {
            return;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO discount_codes_cache (
                code, discount_type, discount_value, max_discount_amount, min_order_amount,
                starts_at, ends_at, max_uses, uses_reserved, max_uses_per_user,
                restriction, requires_link, is_active, product_ids_json, synced_at
             ) VALUES (
                :code, :type, :value, :max_disc, :min_order,
                :starts, :ends, :max_uses, :uses_reserved, :max_per_user,
                :restriction, :requires_link, :is_active, :product_ids, NOW()
             )',
        );

        foreach ($codes as $code) {
            $normalized = strtoupper(trim((string) ($code['code'] ?? '')));
            if ($normalized === '') {
                continue;
            }
            $stmt->execute([
                'code' => $normalized,
                'type' => (string) ($code['discount_type'] ?? 'percent'),
                'value' => (int) ($code['discount_value'] ?? 0),
                'max_disc' => $code['max_discount_amount'] ?? null,
                'min_order' => $code['min_order_amount'] ?? null,
                'starts' => $this->toMysqlDateTime($code['starts_at'] ?? null),
                'ends' => $this->toMysqlDateTime($code['ends_at'] ?? null),
                'max_uses' => $code['max_uses'] ?? null,
                'uses_reserved' => (int) ($code['uses_reserved'] ?? 0),
                'max_per_user' => $code['max_uses_per_user'] ?? null,
                'restriction' => (string) ($code['restriction'] ?? 'all'),
                'requires_link' => ! empty($code['requires_link']) ? 1 : 0,
                'is_active' => ! empty($code['is_active']) ? 1 : 0,
                'product_ids' => json_encode(array_values(array_map('intval', (array) ($code['product_ids'] ?? []))), JSON_UNESCAPED_UNICODE),
            ]);
        }
    }

    private function ensureDiscountSchema(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS discount_codes_cache (
                code VARCHAR(64) NOT NULL PRIMARY KEY,
                discount_type VARCHAR(32) NOT NULL DEFAULT \'percent\',
                discount_value INT NOT NULL DEFAULT 0,
                max_discount_amount INT NULL,
                min_order_amount INT NULL,
                starts_at DATETIME NULL,
                ends_at DATETIME NULL,
                max_uses INT NULL,
                uses_reserved INT NOT NULL DEFAULT 0,
                max_uses_per_user INT NULL,
                restriction VARCHAR(64) NOT NULL DEFAULT \'all\',
                requires_link TINYINT(1) NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                product_ids_json TEXT NULL,
                synced_at DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );
        $ready = true;
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
        // Reference-channel products live in catalog_products for buy/lookup,
        // but the «دوره‌ها» menu must not list them — they have their own entry.
        return $this->catalogProducts(excludeReferenceChannel: true);
    }

    /**
     * All cached catalog products including reference_channel (for buy/lookup).
     *
     * @return list<array<string, mixed>>
     */
    public function allCatalogProducts(): array
    {
        return $this->catalogProducts(excludeReferenceChannel: false);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function catalogProducts(bool $excludeReferenceChannel): array
    {
        $rows = $this->pdo->query('SELECT * FROM catalog_products ORDER BY id DESC')->fetchAll();
        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            if ($excludeReferenceChannel && (string) ($row['product_type'] ?? '') === 'reference_channel') {
                continue;
            }
            $out[] = $row;
        }

        return $out;
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
        foreach ($this->allCatalogProducts() as $course) {
            if ((int) $course['id'] === $productId) {
                $course['photo'] = $course['photo'] ?? $course['photo_url'] ?? null;

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
                    'photo' => $seminar['photo'] ?? $seminar['photo_url'] ?? null,
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

        foreach ($this->allCatalogProducts() as $course) {
            if ((string) ($course['slug'] ?? '') === $slug) {
                $course['photo'] = $course['photo'] ?? $course['photo_url'] ?? null;

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
        $this->ensureCatalogProductTypeColumn();
        $this->ensureSeminarDiscountColumn();

        $this->pdo->exec('DELETE FROM catalog_products');
        $this->pdo->exec('DELETE FROM catalog_seminars');

        $courseStmt = $this->pdo->prepare(
            'INSERT INTO catalog_products (id, slug, title, price, sale_price, photo_url, product_type, synced_at)
             VALUES (:id, :slug, :title, :price, :sale_price, :photo_url, :product_type, NOW())',
        );
        foreach ($courses as $course) {
            $courseStmt->execute([
                'id' => (int) $course['id'],
                'slug' => (string) $course['slug'],
                'title' => (string) $course['title'],
                'price' => $course['price'] ?? null,
                'sale_price' => $course['sale_price'] ?? null,
                'photo_url' => $course['photo'] ?? null,
                'product_type' => (string) ($course['product_type'] ?? 'course'),
            ]);
        }

        $seminarStmt = $this->pdo->prepare(
            'INSERT INTO catalog_seminars (id, product_id, title, seminar_date, location, capacity_hint, price, sale_price, photo_url, reference_discount_amount, synced_at)
             VALUES (:id, :product_id, :title, :date, :location, :capacity_hint, :price, :sale_price, :photo_url, :reference_discount_amount, NOW())',
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
                'reference_discount_amount' => (int) ($seminar['reference_discount_amount'] ?? 0),
            ]);
        }
    }

    /** @param list<array<string, mixed>> $channels */
    private function storeReferenceChannelMeta(array $channels): void
    {
        $primary = $channels[0] ?? null;
        if (! is_array($primary)) {
            $this->storeMessages([
                '__reference_channel_product_id' => '',
                '__reference_channel_title' => '',
                '__reference_channel_product_description' => '',
            ]);

            return;
        }

        $this->storeMessages([
            '__reference_channel_product_id' => (string) (int) ($primary['product_id'] ?? $primary['id'] ?? 0),
            '__reference_channel_title' => (string) ($primary['title'] ?? ''),
            '__reference_channel_product_description' => (string) ($primary['description'] ?? ''),
        ]);
    }

    private function ensureCatalogProductTypeColumn(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        try {
            $this->pdo->exec('ALTER TABLE catalog_products ADD COLUMN product_type VARCHAR(64) NULL');
        } catch (\Throwable) {
            // column already exists
        }
        $ready = true;
    }

    private function ensureSeminarDiscountColumn(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        try {
            $this->pdo->exec('ALTER TABLE catalog_seminars ADD COLUMN reference_discount_amount BIGINT NOT NULL DEFAULT 0');
        } catch (\Throwable) {
            // column already exists
        }
        $ready = true;
    }

    /** @return array<string, mixed>|null */
    public function findReferenceChannelProduct(): ?array
    {
        $productId = (int) $this->message('__reference_channel_product_id', '0');
        if ($productId > 0) {
            $found = $this->findProduct($productId);
            if ($found !== null) {
                return $found;
            }
        }

        foreach ($this->allCatalogProducts() as $course) {
            if ((string) ($course['product_type'] ?? '') === 'reference_channel') {
                $course['photo'] = $course['photo'] ?? $course['photo_url'] ?? null;

                return $course;
            }
            $slug = (string) ($course['slug'] ?? '');
            if (str_starts_with($slug, 'reference-')) {
                $course['photo'] = $course['photo'] ?? $course['photo_url'] ?? null;

                return $course;
            }
        }

        return null;
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
