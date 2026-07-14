<?php

return [
    /*
     * Fixed OTP accounts for local/staging demos. Never enable in production.
     * Defaults to on when APP_ENV=local so dev works without extra .env setup.
     */
    'enabled' => (bool) env('DEMO_OTP_ENABLED', env('APP_ENV') === 'local'),

    'accounts' => [
        '09121111111' => [
            'otp' => '11111',
            'role' => 'agent',
            'name' => 'کارشناس دمو',
            'email' => 'demo-agent@saat.local',
        ],
        '09122222222' => [
            'otp' => '22222',
            'role' => 'leader',
            'name' => 'سرتیم دمو',
            'email' => 'demo-leader@saat.local',
        ],
        '09123333333' => [
            'otp' => '33333',
            'role' => 'supervisor',
            'name' => 'ناظر دمو',
            'email' => 'demo-supervisor@saat.local',
        ],
        '09124444444' => [
            'otp' => '44444',
            'role' => 'manager',
            'name' => 'مدیر دمو',
            'email' => 'demo-manager@saat.local',
        ],
        '09125555555' => [
            'otp' => '55555',
            'role' => 'admin',
            'name' => 'ادمین دمو',
            'email' => 'demo-admin@saat.local',
        ],
    ],
];
