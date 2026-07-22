<?php

declare(strict_types=1);

namespace TelegramHost\Telegram;

/** Thin cURL wrapper around api.telegram.org — token stays local to this host. */
final class BotApiClient
{
    public function __construct(private readonly string $token) {}

    /** @param array<string, mixed> $params */
    public function sendMessage(int|string $chatId, string $text, array $params = []): void
    {
        $this->call('sendMessage', array_merge([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ], $params));
    }

    public function answerCallbackQuery(string $callbackQueryId, string $text = ''): void
    {
        $this->call('answerCallbackQuery', ['callback_query_id' => $callbackQueryId, 'text' => $text]);
    }

    /** @param array<string, mixed> $params */
    private function call(string $method, array $params): void
    {
        $ch = curl_init("https://api.telegram.org/bot{$this->token}/{$method}");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}
