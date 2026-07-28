<?php

declare(strict_types=1);

/**
 * Router for local `php -S 127.0.0.1:8088 ../scripts/telegram-local/router.php`
 * (run with cwd = telegram/).
 *
 * PHP's built-in server often drops Authorization — capture it here.
 */

$telegramRoot = require __DIR__.'/_paths.php';

$auth = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? '';

if ($auth === '' && function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (strcasecmp((string) $name, 'Authorization') === 0) {
            $auth = (string) $value;
            break;
        }
    }
}

if ($auth !== '') {
    $_SERVER['HTTP_AUTHORIZATION'] = $auth;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$file = realpath($telegramRoot.str_replace('/', DIRECTORY_SEPARATOR, $uri));
$root = $telegramRoot;

if ($file === false || $root === false || ! str_starts_with($file, $root) || ! is_file($file)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Not Found: {$uri}\n";

    return true;
}

if (str_ends_with(strtolower($file), '.php')) {
    require $file;

    return true;
}

return false;
