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

        // The response above may already be on its way to Iran by the time
        // we get here (or, on hosts where fastcgi_finish_request() does not
        // truly detach the connection, still be in flight). Either way, once
        // that first echo has happened we must never write to the output
        // buffer or change the HTTP status again — a second echo/response
        // code here is exactly what used to turn a successful ack into a
        // malformed "{ok:true}{ok:false}" / HTTP 500 response on hosts where
        // fastcgi_finish_request() doesn't fully detach. Any failure past
        // this point is logged only.
        $action = (string) ($result['action'] ?? 'refresh_all');
        /** @var array<string, mixed> $body */
        $body = is_array($result['payload'] ?? null) ? $result['payload'] : [];

        try {
            $handler->runDeferred($action, $body);
        } catch (\Throwable $e) {
            error_log('[telegram-host] host-sync: deferred '.$action.' failed: '.$e->getMessage());
        }

        return;
    }

    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    error_log('[telegram-host] host-sync: '.$e->getMessage());
    http_response_code(500);
    // Temporary debug: expose the real error only to whoever holds the
    // webhook secret, so it can be diagnosed without host file access.
    $debugToken = (string) ($_GET['debug'] ?? '');
    $payload = ['ok' => false, 'error' => 'server_error'];
    if ($debugToken !== '' && hash_equals((string) $config['webhook_secret'], $debugToken)) {
        $payload['debug'] = $e::class.': '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine();
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
}
