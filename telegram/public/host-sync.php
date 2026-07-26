<?php

declare(strict_types=1);

use TelegramHost\Http\InboundSyncHandler;

$config = require __DIR__.'/../bootstrap.php';

$origin = (string) ($_SERVER['HTTP_X_PROXY_ORIGIN'] ?? '');
$bearer = '';
if (preg_match('/^Bearer\s+(.+)$/i', (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''), $m)) {
    $bearer = trim($m[1]);
}

$raw = (string) file_get_contents('php://input');
$timestamp = (string) ($_SERVER['HTTP_X_TIMESTAMP'] ?? '');
$nonce = (string) ($_SERVER['HTTP_X_NONCE'] ?? '');
$signature = (string) ($_SERVER['HTTP_X_SIGNATURE'] ?? '');

try {
    $handler = new InboundSyncHandler($config);
    $result = $handler->handle($raw, $timestamp, $nonce, $signature, $origin, $bearer);

    if (! ($result['ok'] ?? false)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);

        return;
    }

    if (! empty($result['defer'])) {
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode(['ok' => true, 'action' => $result['action'] ?? 'sync'], JSON_UNESCAPED_UNICODE);

        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }

        $action = (string) ($result['action'] ?? 'refresh_all');
        /** @var array<string, mixed> $body */
        $body = is_array($result['payload'] ?? null) ? $result['payload'] : [];
        $handler->runDeferred($action, $body);

        return;
    }

    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    error_log('[telegram-host] host-sync: '.$e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'server_error']);
}
