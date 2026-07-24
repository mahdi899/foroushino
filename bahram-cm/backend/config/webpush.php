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
    | Family daily unread reminder
    |--------------------------------------------------------------------------
    */
    'family_daily' => [
        'enabled' => (bool) env('FAMILY_DAILY_PUSH_ENABLED', true),
        /** Asia/Tehran clock — Schedule uses APP_TIMEZONE. */
        'send_at' => env('FAMILY_DAILY_PUSH_AT', '14:00'),
        'title' => 'خانواده',
        'body_with_count' => 'امروز :count پیام جدید در خانواده منتظرته — بیا یه سر بزن.',
        'body_generic' => 'امروز پیام‌های جدید در خانواده هست — بیا اپ را باز کن.',
        'url' => env('FAMILY_DAILY_PUSH_URL'), // null → FAMILY_ENTRY_BASE_URL / apex
    ],

];
