<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Phones that may always use password login (in addition to users who set
    | a password in settings — phone_otp_exempt).
    |--------------------------------------------------------------------------
    */
    'password_login_phones' => array_values(array_filter(array_map(
        static fn (string $phone): string => preg_replace('/\D+/', '', trim($phone)) ?? '',
        explode(',', (string) env('SAAT_PASSWORD_LOGIN_PHONES', '09367018089')),
    ))),

    'backup' => [
        'mysqldump_path' => env('MYSQLDUMP_PATH'),
        'mysql_path' => env('MYSQL_PATH'),
    ],
];
