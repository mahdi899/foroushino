<?php

declare(strict_types=1);

/**
 * Dumb reverse proxy: Main-Server (Iran, api.telegram.org blocked) -> this
 * host (unrestricted network) -> api.telegram.org -> back.
 *
 * Used only for OUTBOUND Bot API calls made directly by the Laravel server
 * (e.g. sendMessage during a delegated registration flow). The external
 * host already talks to api.telegram.org fine (see BotApiClient), so it can
 * relay on the main server's behalf instead of the main server hitting the
 * (blocked) address itself.
 *
 * URL shape mirrors the real Bot API so the caller only swaps the base URL:
 *   https://<host_public_url>/public/api-proxy.php/bot<token>/<method>
 *
 * Auth: `Authorization: Bearer <hmac_secret>` — same secret already shared
 * with the main server for the host-sync bridge. No HMAC/AES here (low
 * value target, single shared secret is enough, mirrors the Cloudflare
 * Worker's identical `PROXY_SHARED_TOKEN` design for the same problem).
 */

$config = require __DIR__.'/../bootstrap.php';

$bearer = '';
if (preg_match('/^Bearer\s+(.+)$/i', (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''), $m)) {
    $bearer = trim($m[1]);
}

if (! hash_equals((string) $config['hmac_secret'], $bearer)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error_code' => 403, 'description' => 'Forbidden']);
    exit;
}

$pathInfo = (string) ($_SERVER['PATH_INFO'] ?? '');
if ($pathInfo === '' || ! preg_match('#^/bot[^/]+/[A-Za-z0-9]+$#', $pathInfo)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error_code' => 400, 'description' => 'Bad proxy path']);
    exit;
}

$target = 'https://api.telegram.org'.$pathInfo;
$query = (string) ($_SERVER['QUERY_STRING'] ?? '');
if ($query !== '') {
    $target .= '?'.$query;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';
$body = file_get_contents('php://input');
$contentType = $_SERVER['CONTENT_TYPE'] ?? 'application/json';

$ch = curl_init($target);
$options = [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => false,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => ['Content-Type: '.$contentType],
];

if ($method !== 'GET' && $method !== 'HEAD') {
    $options[CURLOPT_POSTFIELDS] = $body;
}

curl_setopt_array($ch, $options);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$respContentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/json';
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error_code' => 502, 'description' => 'Upstream unreachable: '.$error]);
    exit;
}

http_response_code($status ?: 200);
header('Content-Type: '.$respContentType);
echo $response;
