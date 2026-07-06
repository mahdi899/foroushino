<?php

namespace App\Services;

use App\Models\AiSetting;
use App\Services\Exceptions\AiServiceException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Central gateway to the configured AI provider (OpenAI-compatible chat
 * completions API). Every AI-powered feature in the app (article generation,
 * chatbot, ...) must go through this service instead of calling HTTP
 * directly, so provider configuration, logging and error handling stay in
 * one place.
 */
class AIService
{
    private const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

    public function isConfigured(): bool
    {
        return AiSetting::current()->isReady();
    }

    /**
     * Send a chat-completion request and return the assistant's reply text.
     *
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array{model?: string, temperature?: float, max_tokens?: int}  $options
     *
     * @throws AiServiceException
     */
    public function chat(array $messages, array $options = [], ?AiSetting $settings = null): string
    {
        $settings ??= AiSetting::current();

        if (! $settings->isReady()) {
            throw new AiServiceException(
                'سرویس هوش مصنوعی تنظیم یا فعال نشده است. لطفاً از بخش «تنظیمات AI» کلید API را وارد و فعال کنید.'
            );
        }

        $baseUrl = rtrim($settings->base_url ?: self::DEFAULT_BASE_URL, '/');

        try {
            $response = Http::withToken((string) $settings->api_key)
                ->timeout(60)
                ->baseUrl($baseUrl)
                ->post('/chat/completions', [
                    'model' => $options['model'] ?? $settings->model,
                    'messages' => $messages,
                    'temperature' => $options['temperature'] ?? $settings->temperature,
                    'max_tokens' => $options['max_tokens'] ?? $settings->max_tokens,
                ]);
        } catch (Throwable $e) {
            Log::channel('ai')->error('AI request could not be sent.', [
                'message' => $e->getMessage(),
                'base_url' => $baseUrl,
            ]);

            throw new AiServiceException('ارتباط با سرویس هوش مصنوعی برقرار نشد. اتصال اینترنت یا آدرس سرویس را بررسی کنید.');
        }

        if ($response->failed()) {
            Log::channel('ai')->error('AI request failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
                'base_url' => $baseUrl,
            ]);

            throw new AiServiceException('درخواست به سرویس هوش مصنوعی ناموفق بود. کلید API یا تنظیمات مدل را بررسی کنید.');
        }

        $content = data_get($response->json(), 'choices.0.message.content');

        if (blank($content)) {
            Log::channel('ai')->warning('AI request returned an empty response.', [
                'body' => $response->body(),
                'base_url' => $baseUrl,
            ]);

            throw new AiServiceException('پاسخ نامعتبر یا خالی از سرویس هوش مصنوعی دریافت شد.');
        }

        return trim((string) $content);
    }

    /**
     * Send a tiny request to confirm the given (or currently saved) settings
     * work. Never throws; always returns a success flag + Persian message.
     *
     * @return array{success: bool, message: string}
     */
    public function testConnection(?AiSetting $settings = null): array
    {
        $settings ??= AiSetting::current();

        try {
            $reply = $this->chat(
                [['role' => 'user', 'content' => 'فقط با کلمه "سلام" پاسخ بده.']],
                ['max_tokens' => 10],
                $settings
            );

            return [
                'success' => true,
                'message' => 'اتصال با موفقیت برقرار شد. پاسخ آزمایشی سرویس: '.$reply,
            ];
        } catch (AiServiceException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}
