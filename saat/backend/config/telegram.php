<?php

return [
    'bot_token' => env('TELEGRAM_BOT_TOKEN', ''),

    'bot_username' => env('TELEGRAM_BOT_USERNAME', ''),

    /*
     * Maximum age (in seconds) an initData payload's auth_date may have before
     * it is rejected as stale (replay protection).
     */
    'max_age' => (int) env('TELEGRAM_AUTH_MAX_AGE', 86400),

    /*
     * Allows the /auth/dev-login endpoint, which mints a Sanctum token for a
     * chosen role/user without going through Telegram — for local dev only.
     */
    'dev_login_enabled' => (bool) env('DEV_LOGIN_ENABLED', false),
];
