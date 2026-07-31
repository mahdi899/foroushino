<?php

declare(strict_types=1);

/**
 * Config for the standalone Telegram "host" app — PHP 8.3, MySQL.
 *
 * Copy this file to `config.php` next to it and fill in the real values.
 * `config.php` is gitignored — never commit it.
 *
 * On the main server run:
 *   php artisan telegram:export-host-config --db-database=... --db-username=... --db-password=... --output=/path/to/config.php
 *
 * Or copy the filled version from admin panel: Telegram → Infrastructure → حالت هاست.
 */
return [
    // Base URL of the sync API on the main Laravel server (host → server pull).
    'sync_base_url' => '__SYNC_BASE_URL__',

    // Shared bearer token for host ↔ Iran bridge (HTTPS + JSON). Same value as
    // `host_sync_secret` stored in Iran admin → Telegram infrastructure.
    'host_sync_token' => '__HOST_SYNC_TOKEN__',

    // X-Proxy-Origin for host → server requests.
    'proxy_origin' => 'Telegram-Host-App',

    // X-Proxy-Origin the host expects on server → host push requests.
    'server_push_origin' => 'Main-Server',

    // Public URL of this host app — same as admin panel «آدرس پایه اپ هاست خارج» (no /public).
    'host_public_url' => '__HOST_PUBLIC_URL__',

    // Telegram webhook secret — must match bot config on main server.
    'webhook_secret' => '__WEBHOOK_SECRET__',

    // Bot API token — only for Bot API outbound calls.
    'bot_token' => '__BOT_TOKEN__',

    // Optional: foreign Bot API proxy when the host cannot reach api.telegram.org
    // (e.g. local Iran → https://bahram.rahai.online/bahram). Leave empty on a
    // real foreign cPanel host that can call Telegram directly.
    // 'telegram_api_base_url' => 'https://bahram.rahai.online/bahram',
    // 'telegram_api_bearer' => 'same-as-PROXY_SHARED_TOKEN',

    'site_base_url' => 'https://rostami.app',

    'db' => [
        'host' => '__DB_HOST__',
        'port' => 3306,
        'database' => '__DB_DATABASE__',
        'username' => '__DB_USERNAME__',
        'password' => '__DB_PASSWORD__',
        'charset' => 'utf8mb4',
    ],

    // Event-driven only — Iran pushes to host-sync.php; optional cron drains queues.
    // After each webhook, drain a few items per queue (heavy work also runs in cron/drain.php).
    'webhook_drain_per_queue' => 3,
    'cron_drain_budget_seconds' => 50,
    'cron_drain_per_queue' => 5,
    // Admin panel: call Iran live/admin/fast instead of heavy process-update (recommended).
    'admin_fast_api' => true,

    // Iran relay batch size when cron/drain.php runs (and cap inside webhook post-ACK drain).
    'iran_relay_per_webhook' => 4,

    'pull_sync_enabled' => false,
    'pull_sync_min_interval_seconds' => 3600,
    // When pull_sync_enabled=true: refresh user rows (KYC, purchases) from Iran via account/fetch.
    'pull_sync_account_enabled' => true,
    'pull_sync_account_interval_seconds' => 300,
    'pull_sync_account_batch_size' => 35,

    // Optional override — normally synced from Iran bootstrap (گروه گزارشات پشتیبانی).
    // 'reports_group_chat_id' => '-100xxxxxxxxxx',

    // Legacy hint (unused when pull_sync_enabled is false).
    'cache_ttl_seconds' => 300,

    // Hybrid per-user cache on the host: hot fields (orders, licenses, KYC)
    // refresh in the background; cold fields (family, referral, SAT) use a longer TTL.
    // Family member_count only refreshes for co-members via this TTL (or when
    // that member's own account is pushed) — pushing every co-member on each
    // join doesn't scale for large families, so keep this reasonably short.
    'hybrid_cache' => [
        'hot_ttl_seconds' => 120,
        'cold_ttl_seconds' => 900,
        'refresh_on_start' => true,
    ],

    // Optional Redis L2 — enable when Redis is available on cPanel (recommended).
    'redis' => [
        'enabled' => true,
        'host' => '127.0.0.1',
        'port' => 6379,
        'password' => null,
        'prefix' => 'tg:',
        'database' => 0,
    ],
];
