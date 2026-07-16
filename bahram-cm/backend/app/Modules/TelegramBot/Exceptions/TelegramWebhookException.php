<?php

namespace App\Modules\TelegramBot\Exceptions;

use RuntimeException;

/**
 * Raised for webhook-side failures: unknown bot key, inactive bot, or a bot
 * that cannot be resolved/seeded from config.
 */
class TelegramWebhookException extends RuntimeException
{
    public static function unknownBot(string $botKey): self
    {
        return new self(sprintf('Unknown Telegram bot key "%s".', $botKey));
    }

    public static function inactiveBot(string $botKey): self
    {
        return new self(sprintf('Telegram bot "%s" is not active.', $botKey));
    }

    public static function missingSecret(string $botKey): self
    {
        return new self(sprintf('Telegram bot "%s" has no webhook secret configured.', $botKey));
    }
}
