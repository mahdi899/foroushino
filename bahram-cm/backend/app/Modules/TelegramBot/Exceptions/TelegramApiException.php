<?php

namespace App\Modules\TelegramBot\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Raised whenever the Telegram Bot API responds with `ok: false`, a non-2xx
 * HTTP status (other than 429, see TelegramRateLimitException), or the HTTP
 * transport fails outright after retries are exhausted.
 */
class TelegramApiException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $context  Safe-to-log context. NEVER include the bot token here.
     */
    public function __construct(
        string $message,
        private readonly int $errorCode = 0,
        private readonly ?string $description = null,
        private readonly array $context = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function fromResponse(string $method, int $httpStatus, array $body, array $context = []): self
    {
        $description = is_string($body['description'] ?? null) ? $body['description'] : null;
        $errorCode = is_int($body['error_code'] ?? null) ? $body['error_code'] : $httpStatus;

        return new self(
            message: sprintf('Telegram API method "%s" failed (HTTP %d): %s', $method, $httpStatus, $description ?? 'unknown error'),
            errorCode: $errorCode,
            description: $description,
            context: $context + ['method' => $method, 'http_status' => $httpStatus],
        );
    }

    public static function fromTransportFailure(string $method, string $reason, array $context = []): self
    {
        return new self(
            message: sprintf('Telegram API method "%s" failed to reach the transport: %s', $method, $reason),
            context: $context + ['method' => $method],
        );
    }

    public function telegramErrorCode(): int
    {
        return $this->errorCode;
    }

    public function description(): ?string
    {
        return $this->description;
    }

    /** @return array<string, mixed> */
    public function context(): array
    {
        return $this->context;
    }
}
