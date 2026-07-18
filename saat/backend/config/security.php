<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Proxy-origin gate (server-to-server REST calls with Bahram / Server 1)
    |--------------------------------------------------------------------------
    |
    | Saat has no public webhook of its own, but its inbound integration
    | routes (leads pushed from Bahram) must never be reachable by hitting
    | the server IP/domain directly. This mirrors the same gate used on
    | bahram-cm: both a Bearer token AND the custom X-Proxy-Origin header are
    | required before the route's own token/HMAC verification even runs.
    |
    */
    'proxy_origin' => [
        'header' => env('PROXY_ORIGIN_HEADER', 'X-Proxy-Origin'),

        'allowed_values' => array_values(array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', (string) env('PROXY_ORIGIN_ALLOWED_VALUES', 'Cloudflare-Worker,Internal-Sync')),
        ))),

        'shared_token' => (string) env('PROXY_SHARED_TOKEN', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | HMAC request signing (server-to-server REST sync with Bahram)
    |--------------------------------------------------------------------------
    |
    | Must use the SAME secret configured on bahram-cm as SAT_SYNC_HMAC_SECRET
    | for inbound applications, and the SAME secret configured here as
    | BAHRAM_CALLBACK_HMAC_SECRET for outbound lead-status callbacks — the two
    | directions may use independent secrets since they are signed/verified
    | by different services.
    |
    */
    'hmac' => [
        'secret' => (string) env('SAT_SYNC_HMAC_SECRET', ''),
        'header_signature' => 'X-Signature',
        'header_timestamp' => 'X-Timestamp',
        'max_skew_seconds' => (int) env('SAT_SYNC_HMAC_MAX_SKEW_SECONDS', 300),
        'nonce_ttl_seconds' => (int) env('SAT_SYNC_HMAC_NONCE_TTL_SECONDS', 600),
    ],

    /*
    |--------------------------------------------------------------------------
    | Reverse channel — Saat -> Bahram lead-status callback
    |--------------------------------------------------------------------------
    */
    'bahram_callback' => [
        'url' => (string) env('BAHRAM_CALLBACK_URL', ''),
        'token' => (string) env('BAHRAM_CALLBACK_TOKEN', ''),
        'hmac_secret' => (string) env('BAHRAM_CALLBACK_HMAC_SECRET', env('SAT_SYNC_HMAC_SECRET', '')),
    ],

];
