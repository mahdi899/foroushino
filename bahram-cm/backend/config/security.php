<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Proxy-origin gate (Cloudflare Worker + server-to-server REST calls)
    |--------------------------------------------------------------------------
    |
    | Endpoints that must never be reachable by hitting the server IP/domain
    | directly (Telegram webhook, cross-server integration routes) require
    | both a Bearer token AND this custom header before any further, more
    | specific authentication (webhook secret, integration token, HMAC
    | signature) is even evaluated. Traffic missing either is dropped with a
    | generic 403 — no distinction is made between "wrong" and "missing" to
    | avoid helping an attacker enumerate the gate.
    |
    | - "strict" mode (used by the Telegram webhook, which has no other
    |   Bearer-based auth) requires the Bearer token to exactly match
    |   `shared_token` (the secret shared with the Cloudflare Worker).
    | - "presence" mode (used by routes that already carry their own
    |   per-record Bearer token, e.g. SAT integration tokens) only requires
    |   *some* Bearer token plus a recognised X-Proxy-Origin value; the
    |   actual token is validated by the route's own auth middleware.
    |
    */
    'proxy_origin' => [
        'header' => env('PROXY_ORIGIN_HEADER', 'X-Proxy-Origin'),

        'allowed_values' => array_values(array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', (string) env('PROXY_ORIGIN_ALLOWED_VALUES', 'Cloudflare-Worker,Internal-Sync,Telegram-Host-App,Main-Server')),
        ))),

        'shared_token' => (string) env('PROXY_SHARED_TOKEN', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | HMAC request signing (server-to-server REST sync with Saat)
    |--------------------------------------------------------------------------
    */
    'hmac' => [
        'secret' => (string) env('SAT_SYNC_HMAC_SECRET', ''),
        'header_signature' => 'X-Signature',
        'header_timestamp' => 'X-Timestamp',
        'max_skew_seconds' => (int) env('SAT_SYNC_HMAC_MAX_SKEW_SECONDS', 300),
        'nonce_ttl_seconds' => (int) env('SAT_SYNC_HMAC_NONCE_TTL_SECONDS', 600),
    ],

];
