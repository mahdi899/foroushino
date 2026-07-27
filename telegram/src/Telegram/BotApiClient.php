<?php

declare(strict_types=1);

namespace TelegramHost\Telegram;

use TelegramHost\Support\TelegramCustomEmoji;

/** Thin cURL wrapper around api.telegram.org — token stays local to this host. */
final class BotApiClient
{
    /** Reused across calls in the same request so repeated sends (e.g. course lists) keep-alive the TCP/TLS connection to api.telegram.org. */
    private static ?\CurlHandle $handle = null;

    public function __construct(private readonly string $token) {}

    /** @param array<string, mixed> $params */
    public function sendMessage(int|string $chatId, string $text, array $params = []): void
    {
        $this->sendMessageResult($chatId, $text, $params);
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function sendMessageResult(int|string $chatId, string $text, array $params = []): array
    {
        $payload = array_merge([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ], $params);

        try {
            return $this->resultOf($this->call('sendMessage', $payload, true));
        } catch (TelegramApiException $e) {
            if ($this->shouldRetryWithoutHtml($e)) {
                return $this->resultOf($this->call('sendMessage', array_merge([
                    'chat_id' => $chatId,
                    'text' => TelegramCustomEmoji::stripHtmlTags($text),
                    'parse_mode' => 'HTML',
                ], TelegramCustomEmoji::stripButtonIcons($params)), true));
            }

            if (! str_contains($e->getMessage(), 'DOCUMENT_INVALID')) {
                throw $e;
            }

            $safeText = TelegramCustomEmoji::stripHtmlTags($text);
            $safeParams = TelegramCustomEmoji::stripButtonIcons($params);

            return $this->resultOf($this->call('sendMessage', array_merge([
                'chat_id' => $chatId,
                'text' => $safeText,
                'parse_mode' => 'HTML',
            ], $safeParams), true));
        }
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function forwardMessage(int|string $toChatId, int|string $fromChatId, int $messageId, array $params = []): array
    {
        return $this->resultOf($this->call('forwardMessage', array_merge([
            'chat_id' => $toChatId,
            'from_chat_id' => $fromChatId,
            'message_id' => $messageId,
        ], $params), true));
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function copyMessage(int|string $toChatId, int|string $fromChatId, int $messageId, array $params = []): array
    {
        return $this->resultOf($this->call('copyMessage', array_merge([
            'chat_id' => $toChatId,
            'from_chat_id' => $fromChatId,
            'message_id' => $messageId,
        ], $params), true));
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
            if ($this->shouldRetryWithoutHtml($e)) {
                $this->call('sendPhoto', array_merge([
                    'chat_id' => $chatId,
                    'photo' => $photo,
                    'caption' => TelegramCustomEmoji::stripHtmlTags($caption),
                    'parse_mode' => 'HTML',
                ], TelegramCustomEmoji::stripButtonIcons($params)));

                return;
            }

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

    private function shouldRetryWithoutHtml(TelegramApiException $e): bool
    {
        $msg = $e->getMessage();

        return str_contains($msg, "can't parse entities")
            || str_contains($msg, 'Unclosed start tag');
    }

    public function sendChatAction(int|string $chatId, string $action = 'typing'): void
    {
        try {
            // Short timeout — typing must never stall the webhook waiting on Telegram.
            $this->call('sendChatAction', [
                'chat_id' => $chatId,
                'action' => $action,
            ], false, 2);
        } catch (\Throwable) {
            // Non-critical — never block Iran calls if typing fails.
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

    public function setWebhook(string $url, ?string $secretToken = null): void
    {
        $params = array_filter([
            'url' => $url,
            'secret_token' => $secretToken,
            'allowed_updates' => [
                'message',
                'edited_message',
                'callback_query',
                'chat_member',
                'my_chat_member',
                'chat_join_request',
            ],
        ], static fn (mixed $value) => $value !== null && $value !== '');

        $this->call('setWebhook', $params);
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
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function createChatInviteLink(int|string $chatId, array $options = []): array
    {
        $params = array_merge(['chat_id' => $chatId], $options);
        $result = $this->call('createChatInviteLink', $params, true);

        return is_array($result['result'] ?? null) ? $result['result'] : [];
    }

    /** @param array<string, mixed> $decoded */
    private function resultOf(array $decoded): array
    {
        return is_array($decoded['result'] ?? null) ? $decoded['result'] : [];
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    private function call(string $method, array $params, bool $return = false, int $timeoutSeconds = 8): array
    {
        if (self::$handle === null) {
            self::$handle = curl_init();
        }
        $ch = self::$handle;

        $timeout = max(1, $timeoutSeconds);
        curl_setopt_array($ch, [
            CURLOPT_URL => "https://api.telegram.org/bot{$this->token}/{$method}",
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => min(3, $timeout),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_ENCODING => '',
            CURLOPT_TCP_KEEPALIVE => 1,
            CURLOPT_FORBID_REUSE => false,
            CURLOPT_FRESH_CONNECT => false,
        ]);
        $raw = curl_exec($ch);

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
