<?php

declare(strict_types=1);

namespace TelegramHost\Telegram;

use TelegramHost\Support\TelegramCustomEmoji;

/** Thin cURL wrapper around api.telegram.org — token stays local to this host. */
final class BotApiClient
{
    public function __construct(private readonly string $token) {}

    /** @param array<string, mixed> $params */
    public function sendMessage(int|string $chatId, string $text, array $params = []): void
    {
        $payload = array_merge([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ], $params);

        try {
            $this->call('sendMessage', $payload);
        } catch (TelegramApiException $e) {
            if (! str_contains($e->getMessage(), 'DOCUMENT_INVALID')) {
                throw $e;
            }

            $safeText = TelegramCustomEmoji::stripHtmlTags($text);
            $safeParams = TelegramCustomEmoji::stripButtonIcons($params);

            $this->call('sendMessage', array_merge([
                'chat_id' => $chatId,
                'text' => $safeText,
                'parse_mode' => 'HTML',
            ], $safeParams));
        }
    }

    /** @param array<string, mixed> $params */
    public function sendPhoto(int|string $chatId, string $photo, string $caption, array $params = []): void
    {
        $payload = array_merge([
            'chat_id' => $chatId,
            'photo' => $photo,
            'caption' => $caption,
            'parse_mode' => 'HTML',
        ], $params);

        try {
            $this->call('sendPhoto', $payload);
        } catch (TelegramApiException $e) {
            if (! str_contains($e->getMessage(), 'DOCUMENT_INVALID')) {
                throw $e;
            }

            $safeCaption = TelegramCustomEmoji::stripHtmlTags($caption);
            $safeParams = TelegramCustomEmoji::stripButtonIcons($params);

            $this->call('sendPhoto', array_merge([
                'chat_id' => $chatId,
                'photo' => $photo,
                'caption' => $safeCaption,
                'parse_mode' => 'HTML',
            ], $safeParams));
        }
    }

    public function answerCallbackQuery(string $callbackQueryId, string $text = '', bool $showAlert = false): void
    {
        $this->call('answerCallbackQuery', [
            'callback_query_id' => $callbackQueryId,
            'text' => mb_substr($text, 0, 200),
            'show_alert' => $showAlert,
        ]);
    }

    /** @return array<string, mixed> */
    public function getChatMember(int|string $chatId, int $userId): array
    {
        $result = $this->call('getChatMember', [
            'chat_id' => $chatId,
            'user_id' => $userId,
        ], true);

        return is_array($result['result'] ?? null) ? $result['result'] : [];
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    private function call(string $method, array $params, bool $return = false): array
    {
        $ch = curl_init("https://api.telegram.org/bot{$this->token}/{$method}");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 12,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);

        if (! is_string($raw)) {
            if ($return) {
                return [];
            }

            return [];
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            if ($return) {
                return [];
            }

            return [];
        }

        if (($decoded['ok'] ?? false) !== true) {
            $description = (string) ($decoded['description'] ?? 'Telegram API error');

            throw new TelegramApiException($description);
        }

        return $return ? $decoded : [];
    }
}
