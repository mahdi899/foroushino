<?php

namespace App\Modules\TelegramBot\Exceptions;

/**
 * Raised when Telegram responds with HTTP 429 (Too Many Requests). Carries
 * the `retry_after` (seconds) Telegram asked us to wait, per the
 * `{"ok":false,"error_code":429,"parameters":{"retry_after":N}}` shape.
 */
class TelegramRateLimitException extends TelegramApiException
{
    public function __construct(
        string $method,
        private readonly int $retryAfter,
        array $context = [],
    ) {
        parent::__construct(
            message: sprintf('Telegram API method "%s" was rate limited; retry after %d seconds.', $method, $retryAfter),
            errorCode: 429,
            description: 'Too Many Requests',
            context: $context + ['method' => $method, 'retry_after' => $retryAfter],
        );
    }

    public function retryAfter(): int
    {
        return $this->retryAfter;
    }
}
