<?php

declare(strict_types=1);

/**
 * Router for `php -S 127.0.0.1:8088 router.php`.
 *
 * PHP's built-in server often drops the Authorization header. Capture it here
 * and include PHP scripts in-process so host-sync Bearer auth works locally.
 */

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
$file = realpath(__DIR__.str_replace('/', DIRECTORY_SEPARATOR, $uri));
$root = realpath(__DIR__);

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
