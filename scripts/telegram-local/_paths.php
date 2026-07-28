<?php

declare(strict_types=1);

/**
 * Local-only tools for Windows/Laragon `telegram/` host.
 * Do NOT upload this folder to the foreign cPanel host.
 *
 * From repo root:
 *   php scripts/telegram-local/enable-host.php
 *   php scripts/telegram-local/refresh-token.php
 *   cd telegram && php -S 127.0.0.1:8088 ../scripts/telegram-local/router.php
 *   php scripts/telegram-local/local-poll.php
 */

$telegramRoot = realpath(__DIR__.'/../../telegram');
if ($telegramRoot === false) {
    fwrite(STDERR, "telegram/ app root not found\n");
    exit(1);
}

return $telegramRoot;
