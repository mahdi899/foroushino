<?php

declare(strict_types=1);

/**
 * Purge active CDN edge cache after deploy (Cloudflare or Arvan).
 * Uses panel-stored credentials with .env fallback — no secrets on CLI.
 *
 * Usage (on server): php scripts/purge-cdn.php
 */

$root = dirname(__DIR__);
require $root.'/vendor/autoload.php';

$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

/** @var \App\Services\CacheService $cache */
$cache = $app->make(\App\Services\CacheService::class);

$result = $cache->purge('cdn', [], 'deploy-script');

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;

$ok = (bool) ($result['cloudflare'] ?? false) || (bool) ($result['arvan'] ?? false);
if (! $ok) {
    fwrite(STDERR, "CDN purge skipped or failed — check cache integrations in admin or CLOUDFLARE_* in .env\n");
    exit(2);
}

exit(0);
