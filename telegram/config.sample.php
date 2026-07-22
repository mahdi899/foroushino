<?php

declare(strict_types=1);

/**
 * Config for the standalone Telegram "host" app — PHP 8.3, MySQL.
 *
 * Copy this file to `config.php` next to it and fill in the real values.
 * `config.php` is gitignored — never commit it. In the admin panel
 * (Telegram → Infrastructure → حالت هاست), after saving, a filled version
 * of this file is rendered for you to download/copy directly.
 */
return [
    // Base URL of the sync API on the main Laravel server. Do not add a
    // trailing slash. Example: https://rostami.app/api/v1/integrations/telegram-host
    'sync_base_url' => '__SYNC_BASE_URL__',

    // HMAC-SHA256 secret shared with the main server (signs every sync request).
    'hmac_secret' => '__HMAC_SECRET__',

    // Base64-encoded 32-byte AES-256-GCM key shared with the main server
    // (encrypts every sync request/response body).
    'aes_key' => '__AES_KEY__',

    // X-Proxy-Origin header value the main server expects from this app.
    'proxy_origin' => 'Telegram-Host-App',

    // Telegram webhook secret token — must match the bot's configured secret
    // (Telegram sends this back in X-Telegram-Bot-Api-Secret-Token).
    'webhook_secret' => '__WEBHOOK_SECRET__',

    // Telegram Bot API token — used ONLY to call api.telegram.org directly
    // (sendMessage, getMe, ...). Never sent to the main server.
    'bot_token' => '__BOT_TOKEN__',

    // Main site URL — used for "Buy on site" / "Continue checkout" links.
    // Payment itself always happens on the main server, never on this host.
    'site_base_url' => 'https://rostami.app',

    // Local MySQL database on this cPanel host (cache + conversation state).
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'CHANGE_ME',
        'username' => 'CHANGE_ME',
        'password' => 'CHANGE_ME',
        'charset' => 'utf8mb4',
    ],

    // How long (seconds) cached bootstrap/catalog data is considered fresh
    // before the cron puller refreshes it again. Purely advisory — the
    // puller itself decides frequency via cron schedule.
    'cache_ttl_seconds' => 300,
];
