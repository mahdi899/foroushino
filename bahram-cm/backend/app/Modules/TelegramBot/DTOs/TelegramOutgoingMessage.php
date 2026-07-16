<?php

namespace App\Modules\TelegramBot\DTOs;

/**
 * Minimal DTO describing an outgoing `sendMessage` call. Handlers/services
 * build one of these instead of assembling the Telegram params array by hand.
 */
final class TelegramOutgoingMessage
{
    /**
     * @param  array<string, mixed>  $options  Extra sendMessage params (reply_markup, reply_to_message_id, …)
     */
    public function __construct(
        public readonly int|string $chatId,
        public readonly string $text,
        public readonly ?string $parseMode = 'HTML',
        public readonly array $options = [],
    ) {}

    /** @return array<string, mixed> */
    public function toPayload(): array
    {
        return array_filter(
            [
                'chat_id' => $this->chatId,
                'text' => $this->text,
                'parse_mode' => $this->parseMode,
                ...$this->options,
            ],
            static fn (mixed $value) => $value !== null,
        );
    }
}
