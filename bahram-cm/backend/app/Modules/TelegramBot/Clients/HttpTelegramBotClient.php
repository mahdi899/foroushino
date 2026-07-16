<?php

namespace App\Modules\TelegramBot\Clients;

use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Exceptions\TelegramApiException;
use App\Modules\TelegramBot\Exceptions\TelegramRateLimitException;
use App\Modules\TelegramBot\Support\TelegramCorrelation;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Laravel Http-based Telegram Bot API client.
 *
 * - Timeout / connect timeout come from config('telegram.http').
 * - HTTP 429 responses are honoured via `retry_after` before retrying.
 * - Transport failures and 5xx responses use exponential backoff retries.
 * - Every log line carries a correlation id but NEVER the bot token — the
 *   token only ever appears inline in the outgoing request URL, which is
 *   never logged.
 */
class HttpTelegramBotClient implements TelegramBotClientInterface
{
    private readonly string $baseUrl;

    public function __construct(
        private readonly string $token,
        ?string $baseUrl = null,
    ) {
        $this->baseUrl = rtrim($baseUrl ?: (string) config('telegram.api_base_url', 'https://api.telegram.org'), '/');
    }

    public function setWebhook(string $url, ?string $secretToken = null, array $options = []): array|bool
    {
        return $this->call('setWebhook', array_filter([
            'url' => $url,
            'secret_token' => $secretToken,
            ...$options,
        ], static fn (mixed $value) => $value !== null));
    }

    public function deleteWebhook(bool $dropPendingUpdates = false): array|bool
    {
        return $this->call('deleteWebhook', ['drop_pending_updates' => $dropPendingUpdates]);
    }

    public function getWebhookInfo(): array
    {
        return (array) $this->call('getWebhookInfo');
    }

    public function getMe(): array
    {
        return (array) $this->call('getMe');
    }

    public function sendMessage(int|string $chatId, string $text, array $options = []): array
    {
        return (array) $this->call('sendMessage', ['chat_id' => $chatId, 'text' => $text, ...$options]);
    }

    public function sendPhoto(int|string $chatId, string $photo, array $options = []): array
    {
        return (array) $this->callWithAttachment('sendPhoto', 'photo', $photo, ['chat_id' => $chatId, ...$options]);
    }

    public function sendVideo(int|string $chatId, string $video, array $options = []): array
    {
        return (array) $this->callWithAttachment('sendVideo', 'video', $video, ['chat_id' => $chatId, ...$options]);
    }

    public function sendAudio(int|string $chatId, string $audio, array $options = []): array
    {
        return (array) $this->callWithAttachment('sendAudio', 'audio', $audio, ['chat_id' => $chatId, ...$options]);
    }

    public function sendVoice(int|string $chatId, string $voice, array $options = []): array
    {
        return (array) $this->callWithAttachment('sendVoice', 'voice', $voice, ['chat_id' => $chatId, ...$options]);
    }

    public function sendDocument(int|string $chatId, string $document, array $options = []): array
    {
        return (array) $this->callWithAttachment('sendDocument', 'document', $document, ['chat_id' => $chatId, ...$options]);
    }

    public function copyMessage(int|string $chatId, int|string $fromChatId, int $messageId, array $options = []): array
    {
        return (array) $this->call('copyMessage', [
            'chat_id' => $chatId,
            'from_chat_id' => $fromChatId,
            'message_id' => $messageId,
            ...$options,
        ]);
    }

    public function forwardMessage(int|string $chatId, int|string $fromChatId, int $messageId, array $options = []): array
    {
        return (array) $this->call('forwardMessage', [
            'chat_id' => $chatId,
            'from_chat_id' => $fromChatId,
            'message_id' => $messageId,
            ...$options,
        ]);
    }

    public function editMessageText(string $text, array $options = []): array|bool
    {
        return $this->call('editMessageText', ['text' => $text, ...$options]);
    }

    public function editMessageCaption(array $options = []): array|bool
    {
        return $this->call('editMessageCaption', $options);
    }

    public function editMessageReplyMarkup(array $options = []): array|bool
    {
        return $this->call('editMessageReplyMarkup', $options);
    }

    public function deleteMessage(int|string $chatId, int $messageId): bool
    {
        return (bool) $this->call('deleteMessage', ['chat_id' => $chatId, 'message_id' => $messageId]);
    }

    public function answerCallbackQuery(string $callbackQueryId, array $options = []): bool
    {
        return (bool) $this->call('answerCallbackQuery', ['callback_query_id' => $callbackQueryId, ...$options]);
    }

    public function getChatMember(int|string $chatId, int $userId): array
    {
        return (array) $this->call('getChatMember', ['chat_id' => $chatId, 'user_id' => $userId]);
    }

    public function getChatAdministrators(int|string $chatId): array
    {
        $result = $this->call('getChatAdministrators', ['chat_id' => $chatId]);

        return is_array($result) ? $result : [];
    }

    public function approveChatJoinRequest(int|string $chatId, int $userId): bool
    {
        return (bool) $this->call('approveChatJoinRequest', ['chat_id' => $chatId, 'user_id' => $userId]);
    }

    public function declineChatJoinRequest(int|string $chatId, int $userId): bool
    {
        return (bool) $this->call('declineChatJoinRequest', ['chat_id' => $chatId, 'user_id' => $userId]);
    }

    public function banChatMember(int|string $chatId, int $userId, array $options = []): bool
    {
        return (bool) $this->call('banChatMember', ['chat_id' => $chatId, 'user_id' => $userId, ...$options]);
    }

    public function unbanChatMember(int|string $chatId, int $userId, array $options = []): bool
    {
        return (bool) $this->call('unbanChatMember', ['chat_id' => $chatId, 'user_id' => $userId, ...$options]);
    }

    public function createChatInviteLink(int|string $chatId, array $options = []): array
    {
        return (array) $this->call('createChatInviteLink', ['chat_id' => $chatId, ...$options]);
    }

    public function revokeChatInviteLink(int|string $chatId, string $inviteLink): array
    {
        return (array) $this->call('revokeChatInviteLink', ['chat_id' => $chatId, 'invite_link' => $inviteLink]);
    }

    public function sendChatAction(int|string $chatId, string $action): bool
    {
        return (bool) $this->call('sendChatAction', ['chat_id' => $chatId, 'action' => $action]);
    }

    /** @param  array<string, mixed>  $params */
    private function callWithAttachment(string $method, string $field, string $file, array $params): array|bool
    {
        if (is_file($file)) {
            return $this->request($method, $params, [$field => $file]);
        }

        // Not a local file — a URL or an existing Telegram file_id. Send as a plain string field.
        return $this->request($method, [$field => $file, ...$params]);
    }

    /** @param  array<string, mixed>  $params */
    private function call(string $method, array $params = []): array|bool
    {
        return $this->request($method, $params);
    }

    /**
     * @param  array<string, mixed>  $params
     * @param  array<string, string>  $attachments  field => absolute local file path
     */
    private function request(string $method, array $params = [], array $attachments = []): array|bool
    {
        $correlationId = TelegramCorrelation::generate();
        $retryTimes = max(0, (int) config('telegram.http.retry_times', 3));
        $baseDelayMs = max(0, (int) config('telegram.http.retry_base_delay_ms', 500));

        $attempt = 0;

        while (true) {
            $attempt++;

            try {
                $request = Http::timeout((int) config('telegram.http.timeout', 20))
                    ->connectTimeout((int) config('telegram.http.connect_timeout', 5))
                    ->withHeaders([TelegramCorrelation::header() => $correlationId]);

                foreach ($attachments as $field => $path) {
                    $request = $request->attach($field, fopen($path, 'r'), basename($path));
                }

                $response = $request->post($this->apiUrl($method), $params);
            } catch (ConnectionException $e) {
                if ($attempt > $retryTimes) {
                    Log::channel('telegram')->error('Telegram API transport failure.', [
                        'method' => $method,
                        'correlation_id' => $correlationId,
                        'attempt' => $attempt,
                        'message' => $e->getMessage(),
                    ]);

                    throw TelegramApiException::fromTransportFailure($method, $e->getMessage(), [
                        'correlation_id' => $correlationId,
                    ]);
                }

                $this->sleepBackoff($attempt, $baseDelayMs);

                continue;
            }

            $body = (array) $response->json();
            $ok = $response->successful() && ($body['ok'] ?? false) === true;

            if ($ok) {
                return $body['result'] ?? true;
            }

            if ($response->status() === 429) {
                $retryAfter = (int) data_get($body, 'parameters.retry_after', (int) ceil($baseDelayMs / 1000));

                if ($attempt > $retryTimes) {
                    Log::channel('telegram')->warning('Telegram API rate limited; retries exhausted.', [
                        'method' => $method,
                        'correlation_id' => $correlationId,
                        'attempt' => $attempt,
                        'retry_after' => $retryAfter,
                    ]);

                    throw new TelegramRateLimitException($method, $retryAfter, ['correlation_id' => $correlationId]);
                }

                Log::channel('telegram')->info('Telegram API rate limited; backing off.', [
                    'method' => $method,
                    'correlation_id' => $correlationId,
                    'attempt' => $attempt,
                    'retry_after' => $retryAfter,
                ]);

                usleep($retryAfter * 1_000_000);

                continue;
            }

            if ($response->serverError() && $attempt <= $retryTimes) {
                Log::channel('telegram')->warning('Telegram API server error; retrying.', [
                    'method' => $method,
                    'correlation_id' => $correlationId,
                    'attempt' => $attempt,
                    'status' => $response->status(),
                ]);

                $this->sleepBackoff($attempt, $baseDelayMs);

                continue;
            }

            Log::channel('telegram')->error('Telegram API call rejected.', [
                'method' => $method,
                'correlation_id' => $correlationId,
                'attempt' => $attempt,
                'status' => $response->status(),
                'description' => $body['description'] ?? null,
                'error_code' => $body['error_code'] ?? null,
            ]);

            throw TelegramApiException::fromResponse($method, $response->status(), $body, [
                'correlation_id' => $correlationId,
            ]);
        }
    }

    private function sleepBackoff(int $attempt, int $baseDelayMs): void
    {
        $delayMs = $baseDelayMs * (2 ** max(0, $attempt - 1));
        usleep($delayMs * 1000);
    }

    /** Never log the return value of this method — it embeds the bot token. */
    private function apiUrl(string $method): string
    {
        return $this->baseUrl.'/bot'.$this->token.'/'.$method;
    }
}
