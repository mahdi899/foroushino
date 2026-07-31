<?php

declare(strict_types=1);

/** Remote hot-patch endpoint — Bearer host_sync_secret required. */
$secret = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (! preg_match('/^Bearer\s+(\S+)$/i', $secret, $m)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}

$config = require dirname(__DIR__).'/config.php';
$expected = (string) ($config['host_sync_token'] ?? '');
if ($expected === '' || ! hash_equals($expected, $m[1])) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode((string) $raw, true);
if (! is_array($payload) || ! is_array($payload['files'] ?? null)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_payload']);
    exit;
}

$allowed = [
    'public/webhook.php',
    'public/apply-host-patch.php',
    'config.php',
    'src/Services/HostRegistrationFlow.php',
    'src/Cache/SyncCache.php',
    'src/Cache/HotCache.php',
    'src/Queue/PendingRegistrationSync.php',
    'src/Queue/BackgroundRegistrationSync.php',
    'cron/pull-sync.php',
];

$root = dirname(__DIR__);
$written = [];
foreach ($payload['files'] as $rel => $b64) {
    if (! is_string($rel) || ! in_array($rel, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'path_not_allowed', 'path' => $rel]);
        exit;
    }
    $bytes = base64_decode((string) $b64, true);
    if ($bytes === false) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_base64', 'path' => $rel]);
        exit;
    }
    $target = $root.'/'.$rel;
    $dir = dirname($target);
    if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'mkdir_failed', 'path' => $rel]);
        exit;
    }
    if (file_put_contents($target, $bytes) === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'write_failed', 'path' => $rel]);
        exit;
    }
    $written[] = $rel;
}

header('Content-Type: application/json');
echo json_encode(['ok' => true, 'written' => $written]);
