<?php

declare(strict_types=1);

/**
 * Minimal PSR-4-ish autoloader — no Composer required on the cPanel host.
 * Maps the `TelegramHost\` namespace to `src/`.
 */
spl_autoload_register(static function (string $class): void {
    $prefix = 'TelegramHost\\';
    if (! str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__.'/src/'.str_replace('\\', '/', $relative).'.php';

    if (is_file($path)) {
        require $path;
    }
});

$configPath = __DIR__.'/config.php';
if (! is_file($configPath)) {
    http_response_code(500);
    echo 'Missing config.php — copy config.sample.php and fill in real values.';
    exit;
}

/** @var array<string, mixed> $config */
$config = require $configPath;

return $config;
