<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Allows the Next.js frontend (and any additional configured origins) to
    | call the public API from the browser. Origins are configurable via the
    | FRONTEND_URL / CORS_ALLOWED_ORIGINS env variables.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_unique(
        env('APP_ENV') === 'production'
            ? array_merge(
                array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))),
                array_filter([env('FRONTEND_URL')]),
            )
            : array_merge(
                array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))),
                [
                    env('FRONTEND_URL', 'http://localhost:3000'),
                    'http://localhost:3000',
                    'http://127.0.0.1:3000',
                ],
            )
    ))),

    'allowed_origins_patterns' => env('APP_ENV') === 'production'
        ? []
        : [
            '#^https?://localhost(:\d+)?$#',
            '#^https?://127\.0\.0\.1(:\d+)?$#',
        ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
