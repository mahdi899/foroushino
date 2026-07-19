<?php

return [

    'fake' => filter_var(env('TELEGRAM_FAKE_CLIENT', false), FILTER_VALIDATE_BOOL),

    'default_bot_key' => env('TELEGRAM_BOT_KEY', 'production'),

    /** Public site base URL for inline keyboard link buttons (must be https, not localhost). */
    'site_base_url' => rtrim((string) env('TELEGRAM_SITE_BASE_URL', 'https://rostami.app'), '/'),

    'api_base_url' => rtrim((string) env('TELEGRAM_API_BASE_URL', 'https://api.telegram.org'), '/'),

    'http' => [
        'timeout' => (int) env('TELEGRAM_HTTP_TIMEOUT', 20),
        'connect_timeout' => (int) env('TELEGRAM_HTTP_CONNECT_TIMEOUT', 5),
        'retry_times' => (int) env('TELEGRAM_HTTP_RETRY_TIMES', 3),
        'retry_base_delay_ms' => (int) env('TELEGRAM_HTTP_RETRY_BASE_DELAY_MS', 500),
    ],

    'webhook' => [
        'base_url' => rtrim((string) env('TELEGRAM_WEBHOOK_BASE_URL', env('APP_URL', 'http://localhost:8010')), '/'),
        'path_pattern' => 'api/v1/integrations/telegram/{botKey}/webhook',
    ],

    'miniapp' => [
        'max_auth_age' => (int) env('TELEGRAM_MINIAPP_MAX_AUTH_AGE', 86400),
    ],

    'login_token' => [
        'ttl_minutes' => (int) env('TELEGRAM_LOGIN_TOKEN_TTL_MINUTES', 10),
    ],

    'membership_cache_seconds' => (int) env('TELEGRAM_MEMBERSHIP_CACHE_SECONDS', 300),

    'user_lock_seconds' => (int) env('TELEGRAM_USER_LOCK_SECONDS', 30),

    'updates' => [
        'max_attempts' => (int) env('TELEGRAM_UPDATE_MAX_ATTEMPTS', 5),
        'retry_batch_size' => (int) env('TELEGRAM_UPDATE_RETRY_BATCH_SIZE', 50),
        'retention_days' => (int) env('TELEGRAM_UPDATE_RETENTION_DAYS', 30),
    ],

    'queues' => [
        'inbound' => env('TELEGRAM_QUEUE_INBOUND', 'telegram-inbound'),
        'replies' => env('TELEGRAM_QUEUE_REPLIES', 'telegram-replies'),
        'transactional' => env('TELEGRAM_QUEUE_TRANSACTIONAL', 'telegram-transactional'),
        'support' => env('TELEGRAM_QUEUE_SUPPORT', 'telegram-support'),
        'broadcast' => env('TELEGRAM_QUEUE_BROADCAST', 'telegram-broadcast'),
        'maintenance' => env('TELEGRAM_QUEUE_MAINTENANCE', 'telegram-maintenance'),
    ],

    'bots' => [
        'production' => [
            'key' => env('TELEGRAM_BOT_KEY', 'production'),
            'display_name' => 'Bahram Academy Bot',
            'username' => env('TELEGRAM_BOT_USERNAME'),
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET'),
            'environment' => 'production',
        ],
    ],

];
