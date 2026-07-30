<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Seminar;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Modules\TelegramBot\Services\BotMessageCatalog;
use App\Modules\TelegramBot\Services\TelegramCatalogMediaService;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSeminarCatalogService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\TelegramHostCatalogRevision;
use Illuminate\Support\Facades\File;

/**
 * Builds a MySQL dump for the external Telegram host (telegram/db/schema.sql tables).
 */
class TelegramHostDatabaseExporter
{
    public function __construct(
        private readonly BotMessageCatalog $messages,
        private readonly TelegramProductCatalogService $products,
        private readonly TelegramSeminarCatalogService $seminars,
        private readonly TelegramCatalogMediaService $catalogMedia,
        private readonly TelegramCheckoutService $checkout,
        private readonly TelegramHostAccountSnapshotService $snapshots,
        private readonly TelegramHostCatalogRevision $catalogRevision,
    ) {}

    public function exportToFile(string $path, ?int $onlyTelegramUserId = null, int $accountLimit = 2000): int
    {
        $bot = TelegramBot::query()->where('key', 'production')->firstOrFail();
        [$sql, $accountRows] = $this->buildSql($bot, $onlyTelegramUserId, $accountLimit);
        File::ensureDirectoryExists(dirname($path));
        File::put($path, $sql);

        return $accountRows;
    }

    /**
     * @return array{0: string, 1: int}
     */
    private function buildSql(TelegramBot $bot, ?int $onlyTelegramUserId, int $accountLimit): array
    {
        $now = date('Y-m-d H:i:s');
        $lines = [
            '-- Telegram host demo/import — generated '.date('c'),
            '-- Import in phpMyAdmin on cPanel AFTER schema.sql',
            'SET NAMES utf8mb4;',
            'SET FOREIGN_KEY_CHECKS=0;',
            '',
        ];

        $messages = collect(BotMessageCatalog::defaults())
            ->mapWithKeys(fn (array $default, string $key) => [$key => $this->messages->get($bot, $key)])
            ->all();
        $messages['site_url_identity'] = TelegramSiteUrl::identityPage();
        $messages['site_url_family'] = TelegramSiteUrl::familyHome();
        $messages['site_url_sat'] = TelegramSiteUrl::satPage();
        $messages['site_url_referral_panel'] = TelegramSiteUrl::page('panel/referrals');
        $messages['__catalog_revision'] = $this->catalogRevision->current();

        $lines[] = 'DELETE FROM bot_messages;';
        foreach ($messages as $key => $body) {
            $lines[] = 'INSERT INTO bot_messages (message_key, body, updated_at) VALUES ('
                .$this->sqlString((string) $key).', '.$this->sqlString((string) $body).', '.$this->sqlString($now).');';
        }
        $lines[] = '';

        $flags = array_merge(
            collect(BotFeatureFlag::cases())
                ->mapWithKeys(fn (BotFeatureFlag $flag) => [$flag->value => $bot->featureEnabled($flag)])
                ->all(),
            [
                'checkout_zarinpal' => $this->checkout->zarinpalEnabled($bot),
                'checkout_c2c' => $this->checkout->cardToCardEnabled($bot),
                'bot_is_active' => (bool) $bot->is_active,
            ],
        );
        $lines[] = 'DELETE FROM bot_feature_flags;';
        foreach ($flags as $key => $enabled) {
            $lines[] = 'INSERT INTO bot_feature_flags (flag_key, enabled, updated_at) VALUES ('
                .$this->sqlString((string) $key).', '.($enabled ? 1 : 0).', '.$this->sqlString($now).');';
        }
        $lines[] = '';

        $lines[] = 'DELETE FROM required_chats;';
        $chats = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
        foreach ($chats as $chat) {
            $lines[] = 'INSERT INTO required_chats (id, chat_id, title, invite_link, is_required, updated_at) VALUES ('
                .(int) $chat->id.', '.$this->sqlString((string) $chat->chat_id).', '
                .$this->sqlString($chat->title).', '.$this->sqlString($chat->invite_link).', '
                .($chat->is_required ? 1 : 0).', '.$this->sqlString($now).');';
        }
        $lines[] = '';

        $lines[] = 'DELETE FROM catalog_products;';
        $lines[] = 'DELETE FROM catalog_seminars;';
        foreach ($this->products->listPublicCourses() as $product) {
            /** @var Product $product */
            $photo = $this->catalogMedia->productPhoto($product);
            $lines[] = 'INSERT INTO catalog_products (id, slug, title, price, sale_price, photo_url, synced_at) VALUES ('
                .(int) $product->id.', '.$this->sqlString((string) $product->slug).', '
                .$this->sqlString((string) $product->title).', '
                .$this->sqlNullableInt($product->price).', '.$this->sqlNullableInt($product->sale_price).', '
                .$this->sqlString($photo).', '.$this->sqlString($now).');';
        }
        foreach ($this->seminars->listUpcoming() as $seminar) {
            /** @var Seminar $seminar */
            $seminar->loadMissing('product');
            $photo = $this->catalogMedia->seminarPhoto($seminar);
            $product = $seminar->product;
            $base = (int) ($seminar->price ?: $product?->price ?: 0);
            $saleRaw = $seminar->sale_price ?? $product?->sale_price;
            $sale = $saleRaw !== null ? (int) $saleRaw : null;
            $lines[] = 'INSERT INTO catalog_seminars (id, product_id, title, seminar_date, location, capacity_hint, is_full, is_ended, slug, price, sale_price, photo_url, synced_at) VALUES ('
                .(int) $seminar->id.', '.$this->sqlNullableInt($seminar->product_id).', '
                .$this->sqlString((string) $seminar->title).', '
                .$this->sqlString($seminar->date?->format('Y-m-d H:i:s')).', '
                .$this->sqlString($seminar->location).', '.$this->sqlNullableInt($seminar->remainingSeats()).', '
                .($seminar->isFull() ? '1' : '0').', '.($seminar->isEnded() ? '1' : '0').', '
                .$this->sqlString((string) ($seminar->slug ?? '')).', '
                .$base.', '.$this->sqlNullableInt($sale).', '.$this->sqlString($photo).', '.$this->sqlString($now).');';
        }
        $lines[] = '';

        $query = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereNotNull('mobile_verified_at')
            ->orderByDesc('updated_at');
        if ($onlyTelegramUserId !== null && $onlyTelegramUserId > 0) {
            $query->where('telegram_user_id', $onlyTelegramUserId);
        } else {
            $query->limit($accountLimit);
        }

        $lines[] = '-- Verified Telegram users (local cache on host — no contact API needed for menu)';
        $accountRows = 0;
        foreach ($query->cursor() as $account) {
            /** @var TelegramAccount $account */
            try {
                $payload = $this->snapshots->accountPayload($account);
                $lines[] = $this->accountInsertSql($payload, $now);
                $accountRows++;
            } catch (\Throwable $e) {
                $lines[] = '-- SKIP telegram_user_id '.$account->telegram_user_id.' : '.$e->getMessage();
            }
        }

        $lines[] = '';
        $lines[] = "INSERT INTO sync_meta (sync_key, synced_at) VALUES ('full_refresh', ".$this->sqlString($now).')'
            .' ON DUPLICATE KEY UPDATE synced_at = VALUES(synced_at);';
        $lines[] = 'SET FOREIGN_KEY_CHECKS=1;';
        $lines[] = '';

        return [implode("\n", $lines), $accountRows];
    }

    /** @param array<string, mixed> $account */
    private function accountInsertSql(array $account, string $now): string
    {
        $snapshot = is_array($account['snapshot'] ?? null) ? $account['snapshot'] : [];
        $verifiedAt = $account['mobile_verified_at'] ?? null;
        $verifiedSql = 'NULL';
        if (is_string($verifiedAt) && $verifiedAt !== '') {
            $ts = strtotime($verifiedAt);
            $verifiedSql = $ts !== false ? $this->sqlString(date('Y-m-d H:i:s', $ts)) : 'NULL';
        }

        return 'INSERT INTO telegram_accounts_cache ('
            .'telegram_user_id, user_id, mobile, mobile_verified_at, display_name, is_bot_admin, '
            .'snapshot_revision, owned_product_ids, profile_json, referral_json, family_json, owned_presents_json, '
            .'snapshot_synced_at, updated_at) VALUES ('
            .(int) ($account['telegram_user_id'] ?? 0).', '
            .$this->sqlNullableInt($account['user_id'] ?? null).', '
            .$this->sqlString(isset($account['mobile']) ? (string) $account['mobile'] : null).', '
            .$verifiedSql.', '
            .$this->sqlString(isset($account['display_name']) ? (string) $account['display_name'] : null).', '
            .(! empty($account['is_bot_admin']) ? 1 : 0).', '
            .$this->sqlString(isset($snapshot['revision']) ? (string) $snapshot['revision'] : null).', '
            .$this->sqlString(json_encode($snapshot['owned_product_ids'] ?? [], JSON_UNESCAPED_UNICODE)).', '
            .$this->sqlString(json_encode($snapshot['profile'] ?? null, JSON_UNESCAPED_UNICODE)).', '
            .$this->sqlString(json_encode($snapshot['referral'] ?? null, JSON_UNESCAPED_UNICODE)).', '
            .$this->sqlString(json_encode($snapshot['family'] ?? null, JSON_UNESCAPED_UNICODE)).', '
            .$this->sqlString(json_encode($snapshot['owned_presents'] ?? [], JSON_UNESCAPED_UNICODE)).', '
            .$this->sqlString($now).', '.$this->sqlString($now)
            .') ON DUPLICATE KEY UPDATE '
            .'user_id=VALUES(user_id), mobile=VALUES(mobile), mobile_verified_at=VALUES(mobile_verified_at), '
            .'display_name=VALUES(display_name), is_bot_admin=VALUES(is_bot_admin), '
            .'snapshot_revision=VALUES(snapshot_revision), owned_product_ids=VALUES(owned_product_ids), '
            .'profile_json=VALUES(profile_json), referral_json=VALUES(referral_json), '
            .'family_json=VALUES(family_json), owned_presents_json=VALUES(owned_presents_json), '
            .'snapshot_synced_at=VALUES(snapshot_synced_at), updated_at=VALUES(updated_at);';
    }

    private function sqlString(?string $value): string
    {
        if ($value === null) {
            return 'NULL';
        }

        return "'".str_replace(["\\", "'", "\0", "\n", "\r"], ["\\\\", "''", '\\0', '\\n', '\\r'], $value)."'";
    }

    private function sqlNullableInt(mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'NULL';
        }

        return (string) (int) $value;
    }
}
