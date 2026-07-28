<?php
declare(strict_types=1);

/**
 * One-shot allowlisted file apply for telegram/ host app.
 * Auth: Authorization Bearer = host_sync_token from config.php
 * DELETE this file after patching.
 */

$config = require __DIR__ . '/../bootstrap.php';
$token = (string) ($config['host_sync_token'] ?? '');
$bearer = '';
if (preg_match('/^Bearer\s+(.+)$/i', (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''), $m)) {
    $bearer = trim($m[1]);
}
$origin = (string) ($_SERVER['HTTP_X_PROXY_ORIGIN'] ?? '');
if ($token === '' || $bearer === '' || !hash_equals($token, $bearer)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}
if ($origin !== '' && $origin !== 'Main-Server' && $origin !== 'Telegram-Host-App') {
    // allow Main-Server / panel tooling
}

$raw = file_get_contents('php://input');
$data = json_decode((string) $raw, true);
if (!is_array($data) || !is_array($data['files'] ?? null)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad_payload']);
    exit;
}

$root = realpath(__DIR__ . '/..');
if ($root === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'root']);
    exit;
}

$allowed = [
    'src/Services/HostSupportService.php',
    'src/Services/ReferenceChannelFlow.php',
    'src/Services/HostDestinationsFlow.php',
    'src/Services/HostAdminShell.php',
    'src/Support/IranCircuitBreaker.php',
    'src/Queue/PendingSupportForward.php',
    'src/Queue/BackgroundSupportForward.php',
    'src/Cache/SyncCache.php',
    'src/Handlers/CallbackQueryHandler.php',
    'src/Handlers/MessageHandler.php',
    'public/webhook.php',
    'public/diagnose.php',
    'src/Http/InboundSyncHandler.php',
    'src/Http/LiveClient.php',
    'src/Queue/BackgroundIranRelay.php',
    'src/Routing/IranSyncRelay.php',
];
$allowedMap = array_fill_keys($allowed, true);
$written = [];
foreach ($data['files'] as $rel => $b64) {
    $rel = str_replace('\\', '/', (string) $rel);
    if (!isset($allowedMap[$rel]) || !is_string($b64)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'path_not_allowed', 'path' => $rel]);
        exit;
    }
    $bin = base64_decode($b64, true);
    if ($bin === false) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'b64', 'path' => $rel]);
        exit;
    }
    $target = $root . '/' . $rel;
    $dir = dirname($target);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'mkdir', 'path' => $rel]);
        exit;
    }
    if (file_put_contents($target, $bin) === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'write', 'path' => $rel]);
        exit;
    }
    $written[] = $rel;
}

header('Content-Type: application/json');
echo json_encode(['ok' => true, 'written' => $written], JSON_UNESCAPED_UNICODE);
