<?php

return [

    /*
    |--------------------------------------------------------------------------
    | VAPID keys (Web Push)
    |--------------------------------------------------------------------------
    |
    | Generate with: php artisan webpush:vapid
    | Public key is also exposed to the Family PWA as NEXT_PUBLIC_VAPID_PUBLIC_KEY.
    |
    */
    'vapid' => [
        'subject' => env('VAPID_SUBJECT', env('APP_URL', 'https://localhost')),
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Family unread reminder (hourly digest)
    |--------------------------------------------------------------------------
    |
    | Runs every hour. Sends at most one push per subscription per hour when
    | the member has unseen posts. Env keys keep FAMILY_DAILY_* for BC.
    |
    */
    'family_daily' => [
        'enabled' => (bool) env('FAMILY_DAILY_PUSH_ENABLED', true),
        /** @deprecated Unused — schedule is hourly (kept for old .env files). */
        'send_at' => env('FAMILY_DAILY_PUSH_AT', '14:00'),
        'title' => 'خانواده',
        'body_with_count' => ':count پیام جدید در خانواده منتظرته — بیا یه سر بزن.',
        'body_generic' => 'پیام جدید در خانواده هست — بیا اپ را باز کن.',
        'body_one' => '۱ پیام جدید در خانواده منتظرته — بیا یه سر بزن.',
        'url' => env('FAMILY_DAILY_PUSH_URL'), // null → FAMILY_ENTRY_BASE_URL / apex
        /** Min gap between unread digests for the same subscription. */
        'cooldown_minutes' => (int) env('FAMILY_UNREAD_PUSH_COOLDOWN_MINUTES', 55),
    ],

];
