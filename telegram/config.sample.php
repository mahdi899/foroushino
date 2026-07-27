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

    // Bot API token — only for api.telegram.org outbound calls.
    'bot_token' => '__BOT_TOKEN__',

    'site_base_url' => 'https://rostami.app',

    'db' => [
        'host' => '__DB_HOST__',
        'port' => 3306,
        'database' => '__DB_DATABASE__',
        'username' => '__DB_USERNAME__',
        'password' => '__DB_PASSWORD__',
        'charset' => 'utf8mb4',
    ],

    // Event-driven only — Iran pushes to host-sync.php; no cPanel cron required.
    // After each webhook, drain a few queued Iran updates (admin-panel/C2C/SAT
    // delegates that were queued while Iran was briefly unreachable). Keep this
    // at 2+: a value of 0 means the queue never drains and delegated updates
    // (e.g. admin panel actions) pile up forever once even one relay fails.
    'iran_relay_per_webhook' => 2,

    'pull_sync_enabled' => false,
    'pull_sync_min_interval_seconds' => 3600,
    'membership_cache_ttl_seconds' => 900,

    // Optional override — normally synced from Iran bootstrap (گروه گزارشات پشتیبانی).
    // 'reports_group_chat_id' => '-100xxxxxxxxxx',

    // Legacy hint (unused when pull_sync_enabled is false).
    'cache_ttl_seconds' => 300,
];
