<?php

/**
 * Local smoke: three documented TEST-NET clients against purchase-order limiter.
 *
 * Usage (from repo root, Laravel must be on :8010 with MySQL up + at least one product):
 *   set PURCHASE_ORDER_PER_MINUTE=2   (on the artisan serve / php-fpm process)
 *   php scripts/checkout-local/rate-limit-smoke.php
 *
 * Does not call Zarinpal or send SMS.
 *
 * Automated equivalent (no MySQL required): 
 *   cd bahram-cm/backend && php artisan test --filter=CheckoutRateLimitTest
 */

declare(strict_types=1);

$base = getenv('CHECKOUT_SMOKE_API') ?: 'http://127.0.0.1:8010/api';
$limit = (int) (getenv('CHECKOUT_SMOKE_ORDER_LIMIT') ?: 2);

$clients = [
    'A' => '203.0.113.10',
    'B' => '203.0.113.11',
    'C' => '203.0.113.12',
];

function httpJson(string $method, string $url, array $headers, ?array $body = null): array
{
    $ch = curl_init($url);
    $hdrs = [];
    foreach ($headers as $k => $v) {
        $hdrs[] = $k.': '.$v;
    }
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $hdrs,
        CURLOPT_TIMEOUT => 15,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
    }
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    return [
        'status' => $status,
        'body' => is_string($raw) ? json_decode($raw, true) : null,
        'error' => $err ?: null,
    ];
}

echo "API: {$base}\n";
echo "Per-actor order limit for this smoke (configure PURCHASE_ORDER_PER_MINUTE={$limit} on backend):\n\n";

// Discover an active product
$products = httpJson('GET', rtrim($base, '/').'/products', [
    'Accept' => 'application/json',
]);
$productId = $products['body']['data'][0]['id'] ?? $products['body'][0]['id'] ?? null;
if (! $productId) {
    fwrite(STDERR, "No product found via GET /api/products — seed local DB first.\n");
    exit(1);
}

echo "Using product_id={$productId}\n\n";

$results = [];
foreach ($clients as $label => $ip) {
    $phone = '0912'.str_pad((string) (1000000 + ord($label)), 7, '0', STR_PAD_LEFT);
    $statuses = [];
    for ($i = 1; $i <= $limit + 1; $i++) {
        $res = httpJson('POST', rtrim($base, '/').'/orders', [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-Forwarded-For' => $ip,
            'X-Real-IP' => $ip,
        ], [
            'product_id' => $productId,
            'customer_name' => "Client {$label}",
            'customer_phone' => $phone,
        ]);
        $statuses[] = $res['status'];
        echo "Client {$label} ({$ip}) attempt {$i}: HTTP {$res['status']}\n";
    }
    $results[$label] = $statuses;
    echo "\n";
}

$ok = true;
foreach ($clients as $label => $ip) {
    $statuses = $results[$label];
    $expectedOk = array_slice($statuses, 0, $limit);
    $last = $statuses[$limit] ?? null;
    foreach ($expectedOk as $s) {
        if ($s !== 201) {
            $ok = false;
        }
    }
    if ($last !== 429) {
        $ok = false;
        echo "FAIL Client {$label}: expected final 429, got {$last}\n";
    } else {
        echo "OK Client {$label}: first {$limit} created, then 429 (bucket independent of others)\n";
    }
}

// Cross-check: after A is limited, B and C still had their own successes above.
echo "\nBucket independence: Client A/B/C each hit their own ceiling — shared 127.0.0.1 bucket would 429 everyone after {$limit} total.\n";

exit($ok ? 0 : 2);
