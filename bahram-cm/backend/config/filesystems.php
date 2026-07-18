<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

        // Family heavy media (voice/video/image) — Download Host reached only by
        // Backend/Workers. Never exposed to Next.js, Flutter, or the browser.
        // Playback is served from FAMILY_MEDIA_CDN_URL, never proxied through Laravel.
        'family_media_ftp' => [
            'driver' => 'ftp',
            'host' => env('FAMILY_MEDIA_FTP_HOST', ''),
            'username' => env('FAMILY_MEDIA_FTP_USERNAME', ''),
            'password' => env('FAMILY_MEDIA_FTP_PASSWORD', ''),
            'port' => (int) env('FAMILY_MEDIA_FTP_PORT', 21),
            'root' => env('FAMILY_MEDIA_FTP_ROOT', '/'),
            'passive' => filter_var(env('FAMILY_MEDIA_FTP_PASSIVE', true), FILTER_VALIDATE_BOOL),
            'ssl' => filter_var(env('FAMILY_MEDIA_FTP_SSL', false), FILTER_VALIDATE_BOOL),
            'timeout' => (int) env('FAMILY_MEDIA_FTP_TIMEOUT', 60),
            'throw' => true,
        ],

        // Site media library (admin gallery + family sync) — set MEDIA_DISK=site_media_ftp in production.
        // NOTE: overridden at runtime from the panel-managed connection (see
        // App\Support\MediaFtpConnection + AppServiceProvider::configureDynamicMediaDisk())
        // when an admin has saved Host/Username/Password/Port from the media panel —
        // these env vars are only the fallback for a pure env-config deployment.
        'site_media_ftp' => [
            'driver' => 'ftp',
            'host' => env('MEDIA_FTP_HOST', env('FAMILY_MEDIA_FTP_HOST', '')),
            'username' => env('MEDIA_FTP_USERNAME', env('FAMILY_MEDIA_FTP_USERNAME', '')),
            'password' => env('MEDIA_FTP_PASSWORD', env('FAMILY_MEDIA_FTP_PASSWORD', '')),
            'port' => (int) env('MEDIA_FTP_PORT', env('FAMILY_MEDIA_FTP_PORT', 21)),
            'root' => env('MEDIA_FTP_ROOT', env('FAMILY_MEDIA_FTP_ROOT', '/')),
            'passive' => filter_var(env('MEDIA_FTP_PASSIVE', env('FAMILY_MEDIA_FTP_PASSIVE', true)), FILTER_VALIDATE_BOOL),
            'ssl' => filter_var(env('MEDIA_FTP_SSL', env('FAMILY_MEDIA_FTP_SSL', false)), FILTER_VALIDATE_BOOL),
            'timeout' => (int) env('MEDIA_FTP_TIMEOUT', env('FAMILY_MEDIA_FTP_TIMEOUT', 60)),
            'throw' => true,
        ],

        // SFTP counterpart of the disk above — set MEDIA_DISK=site_media_sftp
        // (or save protocol=sftp from the panel) to use this instead of plain FTP.
        'site_media_sftp' => [
            'driver' => 'sftp',
            'host' => env('MEDIA_SFTP_HOST', env('MEDIA_FTP_HOST', '')),
            'username' => env('MEDIA_SFTP_USERNAME', env('MEDIA_FTP_USERNAME', '')),
            'password' => env('MEDIA_SFTP_PASSWORD', env('MEDIA_FTP_PASSWORD', '')),
            'privateKey' => env('MEDIA_SFTP_PRIVATE_KEY', ''),
            'passphrase' => env('MEDIA_SFTP_PASSPHRASE', ''),
            'port' => (int) env('MEDIA_SFTP_PORT', 22),
            'root' => env('MEDIA_SFTP_ROOT', env('MEDIA_FTP_ROOT', '/')),
            'timeout' => (int) env('MEDIA_SFTP_TIMEOUT', env('MEDIA_FTP_TIMEOUT', 60)),
            'throw' => true,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
