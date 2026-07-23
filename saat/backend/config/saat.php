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

    'cloudflare' => [
        'zone_id' => env('CLOUDFLARE_ZONE_ID', ''),
        'api_token' => env('CLOUDFLARE_API_TOKEN', ''),
    ],

    'backup' => [
        'mysqldump_path' => env('MYSQLDUMP_PATH'),
        'mysql_path' => env('MYSQL_PATH'),
        'daily_retention_days' => (int) env('BACKUP_DAILY_RETENTION_DAYS', 30),
        'weekly_retention_days' => (int) env('BACKUP_WEEKLY_RETENTION_DAYS', 90),
        'download_host' => [
            'base_path' => env('BACKUP_FTP_BASE', 'backups'),
            'site_slug' => env('BACKUP_SITE_SLUG', 'saat'),
            'cdn_url' => env('BACKUP_CDN_URL', ''),
            'retention_days' => (int) env('BACKUP_FTP_RETENTION_DAYS', 90),
            'weekday' => env('BACKUP_WEEKLY_WEEKDAY', '0'),
            'host' => env('BACKUP_FTP_HOST', ''),
            'username' => env('BACKUP_FTP_USERNAME', ''),
            'password' => env('BACKUP_FTP_PASSWORD', ''),
            'port' => (int) env('BACKUP_FTP_PORT', 21),
            'root' => env('BACKUP_FTP_ROOT', '/'),
            'passive' => env('BACKUP_FTP_PASSIVE', true),
            'ssl' => env('BACKUP_FTP_SSL', false),
            'timeout' => (int) env('BACKUP_FTP_TIMEOUT', 120),
            'protocol' => env('BACKUP_FTP_PROTOCOL', 'ftp'),
        ],
    ],
];
