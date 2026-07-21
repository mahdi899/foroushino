<?php

declare(strict_types=1);

/**
 * Telegram Bridge Proxy — PHP 8.3 / 8.4
 *
 * فقط PROXY_SHARED_TOKEN — توکن ربات روی پروکسی گذاشته نمی‌شود.
 *
 * نصب:
 *   1) این فایل → مثلاً /bahram/index.php
 *   2) .htaccess کنارش
 *   3) در پنل آدرس: https://your-host.example/bahram  (بدون /index.php)
 */

const BACKEND_ORIGIN = '__BACKEND_ORIGIN__';
const PROXY_SHARED_TOKEN = '__PROXY_SHARED_TOKEN__';
const PROXY_ORIGIN_VALUE = 'Cloudflare-Worker';
const TELEGRAM_API_ORIGIN = 'https://api.telegram.org';
const WEBHOOK_PATH_PREFIX = '/api/v1/integrations/telegram/';
const DEDUPE_TTL_SECONDS = 120;

$path = resolveProxyPath();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if (str_starts_with($path, '/bot') || str_starts_with($path, '/file/bot')) {
    proxyTelegramApi($path);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method Not Allowed; path='.$path;
    exit;
}

if (! str_starts_with($path, WEBHOOK_PATH_PREFIX) || ! str_ends_with($path, '/webhook')) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found path='.$path;
    exit;
}

$botKey = substr($path, strlen(WEBHOOK_PATH_PREFIX));
$botKey = preg_replace('#/webhook$#', '', $botKey) ?? '';
if ($botKey === '' || str_contains($botKey, '/')) {
    http_response_code(404);
    echo 'Not Found';
    exit;
}

$body = file_get_contents('php://input') ?: '';
$update = json_decode($body, true);
if (! is_array($update)) {
    http_response_code(400);
    echo 'Bad Request';
    exit;
}

if (! isset($update['update_id']) || ! is_numeric($update['update_id'])) {
    header('Content-Type: application/json');
    echo '{"ok":true}';
    exit;
}

$updateId = (string) $update['update_id'];
$dedupeFile = sys_get_temp_dir().'/tg_dedupe_'.md5($updateId);
if (is_file($dedupeFile) && (time() - filemtime($dedupeFile)) < DEDUPE_TTL_SECONDS) {
    header('Content-Type: application/json');
    echo '{"ok":true}';
    exit;
}
@file_put_contents($dedupeFile, (string) time());

$query = $_SERVER['QUERY_STRING'] ?? '';
$forwardUrl = rtrim(BACKEND_ORIGIN, '/').$path.($query !== '' ? '?'.$query : '');

$headers = [
    'Content-Type: '.(($_SERVER['CONTENT_TYPE'] ?? '') ?: 'application/json'),
    'Authorization: Bearer '.PROXY_SHARED_TOKEN,
    'X-Proxy-Origin: '.PROXY_ORIGIN_VALUE,
];

$tgSecret = requestHeader('X-Telegram-Bot-Api-Secret-Token');
if ($tgSecret !== '') {
    $headers[] = 'X-Telegram-Bot-Api-Secret-Token: '.$tgSecret;
}

$result = curlRequest('POST', $forwardUrl, $body, $headers);
http_response_code($result['status']);
header('Content-Type: '.($result['content_type'] ?: 'application/json'));
echo $result['body'];
exit;

function resolveProxyPath(): string
{
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    if (is_string($pathInfo) && $pathInfo !== '') {
        return '/'.ltrim($pathInfo, '/');
    }

    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
    $baseDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');

    if ($baseDir !== '' && $baseDir !== '/' && str_starts_with($uriPath, $baseDir)) {
        $uriPath = substr($uriPath, strlen($baseDir)) ?: '/';
    }

    if (preg_match('#^/index\.php(/.*)?$#', $uriPath, $m) === 1) {
        $uriPath = $m[1] ?? '/';
    }

    if ($uriPath === '' || ! str_starts_with($uriPath, '/')) {
        $uriPath = '/'.ltrim($uriPath, '/');
    }

    return $uriPath;
}

function requestHeader(string $name): string
{
    $key = 'HTTP_'.strtoupper(str_replace('-', '_', $name));
    $value = $_SERVER[$key] ?? '';
    if (is_string($value) && $value !== '') {
        return $value;
    }

    if (function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $headerName => $headerValue) {
            if (strcasecmp((string) $headerName, $name) === 0) {
                return (string) $headerValue;
            }
        }
    }

    return '';
}

function proxyTelegramApi(string $path): void
{
    $auth = requestHeader('Authorization');
    $expected = 'Bearer '.PROXY_SHARED_TOKEN;
    if ($auth === '' || ! hash_equals($expected, $auth)) {
        http_response_code(403);
        echo 'Forbidden';
        exit;
    }

    $query = $_SERVER['QUERY_STRING'] ?? '';
    $target = rtrim(TELEGRAM_API_ORIGIN, '/').$path.($query !== '' ? '?'.$query : '');
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $body = ($method === 'GET' || $method === 'HEAD') ? null : (file_get_contents('php://input') ?: '');

    $headers = [];
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if ($contentType !== '') {
        $headers[] = 'Content-Type: '.$contentType;
    }

    $result = curlRequest($method, $target, $body, $headers);
    http_response_code($result['status']);
    if ($result['content_type']) {
        header('Content-Type: '.$result['content_type']);
    }
    echo $result['body'];
}

/**
 * @param  list<string>  $headers
 * @return array{status:int, body:string, content_type:?string}
 */
function curlRequest(string $method, string $url, ?string $body, array $headers): array
{
    $ch = curl_init($url);
    if ($ch === false) {
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'curl_init failed'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $opts = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADER => true,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);

    $raw = curl_exec($ch);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        http_response_code(502);
        header('Content-Type: application/json');
        echo json_encode([
            'ok' => false,
            'error' => 'Upstream Unreachable',
            'detail' => $err,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    $rawHeaders = substr($raw, 0, $headerSize);
    $respBody = substr($raw, $headerSize);
    $respCt = null;
    if (preg_match('/^Content-Type:\s*(.+)$/mi', $rawHeaders, $m) === 1) {
        $respCt = trim($m[1]);
    }

    return [
        'status' => $status,
        'body' => $respBody === false ? '' : $respBody,
        'content_type' => $respCt,
    ];
}
