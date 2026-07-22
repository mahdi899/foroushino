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

    // HMAC-SHA256 secret shared with the main server (both directions).
    'hmac_secret' => '__HMAC_SECRET__',

    // Base64-encoded 32-byte AES-256-GCM key shared with the main server.
    'aes_key' => '__AES_KEY__',

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

    // Cron pull interval hint (seconds). Server push invalidates cache immediately.
    'cache_ttl_seconds' => 300,
];
