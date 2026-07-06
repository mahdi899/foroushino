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

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_unique(array_merge(
        array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))),
        [
            env('FRONTEND_URL', 'http://localhost:3000'),
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ]
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
