<?php

namespace App\Services;

use App\Models\SmsProvider;
use App\Models\SmsSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TelegramBotClient
{
    public function __construct(
        private readonly ?string $token,
        private readonly ?string $baseUrl = null,
    ) {}

    public static function fromAdminConfig(): self
    {
        $provider = SmsProvider::query()->where('slug', 'telegram')->first();
        $token = trim((string) $provider?->credentials);

        return new self(
            token: $token !== '' ? $token : null,
            baseUrl: filled($provider?->base_url) ? (string) $provider->base_url : null,
        );
    }

    /** @return list<string> */
    public static function adminChatIds(): array
    {
        $raw = (string) SmsSetting::current()->admin_telegram_chat_ids;
        $parts = preg_split('/[\s,;]+/', $raw) ?: [];

        return array_values(array_filter(array_map('trim', $parts), fn ($id) => $id !== ''));
    }

    public function isConfigured(): bool
    {
        return filled($this->token);
    }

    public function resolvedBase(): string
    {
        return rtrim($this->baseUrl ?: 'https://api.telegram.org', '/');
    }

    public function sendMessage(string $chatId, string $text, string $parseMode = 'HTML'): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $response = Http::timeout(20)->post($this->apiUrl('sendMessage'), [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => $parseMode,
                'disable_web_page_preview' => true,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Telegram sendMessage failed.', [
                'chat_id' => $chatId,
                'message' => $e->getMessage(),
            ]);

            return false;
        }

        $body = $response->json();
        $ok = $response->successful() && data_get($body, 'ok') === true;

        if (! $ok) {
            Log::channel('sms')->error('Telegram sendMessage rejected.', [
                'chat_id' => $chatId,
                'response' => $body,
            ]);
        }

        return $ok;
    }

    public function sendDocument(string $chatId, string $filePath, ?string $caption = null): bool
    {
        if (! $this->isConfigured() || ! is_file($filePath)) {
            return false;
        }

        try {
            $request = Http::timeout(120)
                ->attach('document', file_get_contents($filePath), basename($filePath));

            $payload = ['chat_id' => $chatId];
            if ($caption !== null && $caption !== '') {
                $payload['caption'] = $caption;
            }

            $response = $request->post($this->apiUrl('sendDocument'), $payload);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Telegram sendDocument failed.', [
                'chat_id' => $chatId,
                'file' => $filePath,
                'message' => $e->getMessage(),
            ]);

            return false;
        }

        $body = $response->json();
        $ok = $response->successful() && data_get($body, 'ok') === true;

        if (! $ok) {
            Log::channel('sms')->error('Telegram sendDocument rejected.', [
                'chat_id' => $chatId,
                'file' => $filePath,
                'response' => $body,
            ]);
        }

        return $ok;
    }

    private function apiUrl(string $method): string
    {
        return $this->resolvedBase().'/bot'.$this->token.'/'.$method;
    }
}
