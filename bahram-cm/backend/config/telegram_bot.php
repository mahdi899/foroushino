<?php

return [

    'default_bot_key' => env('TELEGRAM_BOT_KEY', 'production'),

    'api_base_url' => rtrim((string) env('TELEGRAM_API_BASE_URL', 'https://api.telegram.org'), '/'),

    'use_fake_client' => (bool) env('TELEGRAM_USE_FAKE_CLIENT', false),

    'bots' => [
        'production' => [
            'key' => env('TELEGRAM_BOT_KEY', 'production'),
            'display_name' => 'Bahram Academy Bot (Production)',
            'token_env' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret_env' => 'TELEGRAM_WEBHOOK_SECRET',
            'username_env' => 'TELEGRAM_BOT_USERNAME',
            'environment' => 'production',
        ],
        'staging' => [
            'key' => env('TELEGRAM_STAGING_BOT_KEY', 'staging'),
            'display_name' => 'Bahram Academy Bot (Staging)',
            'token_env' => 'TELEGRAM_STAGING_BOT_TOKEN',
            'webhook_secret_env' => 'TELEGRAM_STAGING_WEBHOOK_SECRET',
            'username_env' => 'TELEGRAM_STAGING_BOT_USERNAME',
            'environment' => 'staging',
        ],
    ],

    'queues' => [
        'inbound' => env('TELEGRAM_QUEUE_INBOUND', 'telegram-inbound'),
        'replies' => env('TELEGRAM_QUEUE_REPLIES', 'telegram-replies'),
        'transactional' => env('TELEGRAM_QUEUE_TRANSACTIONAL', 'telegram-transactional'),
        'support' => env('TELEGRAM_QUEUE_SUPPORT', 'telegram-support'),
        'broadcast' => env('TELEGRAM_QUEUE_BROADCAST', 'telegram-broadcast'),
        'maintenance' => env('TELEGRAM_QUEUE_MAINTENANCE', 'telegram-maintenance'),
    ],

    'timeouts' => [
        'http' => (int) env('TELEGRAM_HTTP_TIMEOUT', 20),
        'connect' => (int) env('TELEGRAM_HTTP_CONNECT_TIMEOUT', 5),
        'retry_times' => (int) env('TELEGRAM_HTTP_RETRY_TIMES', 3),
        'retry_base_delay_ms' => (int) env('TELEGRAM_HTTP_RETRY_BASE_DELAY_MS', 500),
    ],

    'miniapp' => [
        'max_auth_age' => (int) env('TELEGRAM_MINIAPP_MAX_AUTH_AGE', 86400),
    ],

    'user_lock_seconds' => (int) env('TELEGRAM_USER_LOCK_SECONDS', 30),

    'membership_cache_seconds' => (int) env('TELEGRAM_MEMBERSHIP_CACHE_SECONDS', 300),

    'webhook' => [
        'base_url' => rtrim((string) env('TELEGRAM_WEBHOOK_BASE_URL', env('APP_URL', 'http://localhost:8010')), '/'),
        'path_pattern' => 'api/v1/integrations/telegram/{botKey}/webhook',
    ],

    'updates' => [
        'max_attempts' => (int) env('TELEGRAM_UPDATE_MAX_ATTEMPTS', 5),
        'retry_batch_size' => (int) env('TELEGRAM_UPDATE_RETRY_BATCH_SIZE', 50),
        'retention_days' => (int) env('TELEGRAM_UPDATE_RETENTION_DAYS', 30),
    ],

    'login_token' => [
        'ttl_minutes' => (int) env('TELEGRAM_LOGIN_TOKEN_TTL_MINUTES', 10),
    ],

    /*
    | Always-on bot admins (Telegram user ids / @usernames).
    | Checked in code even if is_bot_admin is flipped off in DB.
    */
    'permanent_admins' => [
        'telegram_user_ids' => array_values(array_filter(array_map(
            static fn (string $id): int => (int) trim($id),
            explode(',', (string) env('TELEGRAM_PERMANENT_ADMIN_USER_IDS', '97343715,303360676')),
        ))),
        'usernames' => array_values(array_filter(array_map(
            static fn (string $username): string => strtolower(ltrim(trim($username), '@')),
            explode(',', (string) env('TELEGRAM_PERMANENT_ADMIN_USERNAMES', 'PVamin,mahdi_akbari')),
        ))),
    ],

];
