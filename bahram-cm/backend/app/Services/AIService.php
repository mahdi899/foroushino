<?php

namespace App\Services;

use App\Models\AiSetting;
use App\Services\Exceptions\AiServiceException;
use App\Support\Ai\AiProviderCatalog;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Central gateway to configured AI providers (OpenAI-compatible, Gemini, Anthropic).
 */
class AIService
{
    private const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

    public function isConfigured(): bool
    {
        return AiSetting::current()->isReady();
    }

    /**
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
                'سرویس هوش مصنوعی تنظیم یا فعال نشده است. لطفاً از بخش «هوش مصنوعی» کلید API را وارد و فعال کنید.'
            );
        }

        $provider = (string) ($settings->provider_name ?: 'openai');
        $apiStyle = AiProviderCatalog::apiStyle($provider);
        $model = (string) ($options['model'] ?? $settings->model);
        $temperature = (float) ($options['temperature'] ?? $settings->temperature);
        $maxTokens = (int) ($options['max_tokens'] ?? $settings->max_tokens);
        $apiKey = (string) $settings->api_key;
        $baseUrl = rtrim($settings->base_url ?: self::DEFAULT_BASE_URL, '/');

        try {
            $response = match ($apiStyle) {
                'anthropic' => $this->requestAnthropic($baseUrl, $apiKey, $model, $temperature, $maxTokens, $messages),
                'gemini' => $this->requestGemini($baseUrl, $apiKey, $model, $temperature, $messages),
                default => $this->requestOpenAiCompatible($baseUrl, $apiKey, $model, $temperature, $maxTokens, $messages),
            };
        } catch (AiServiceException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::channel('ai')->error('AI request could not be sent.', [
                'message' => $e->getMessage(),
                'provider' => $provider,
                'base_url' => $baseUrl,
            ]);

            throw new AiServiceException('ارتباط با سرویس هوش مصنوعی برقرار نشد. اتصال اینترنت یا آدرس سرویس را بررسی کنید.');
        }

        if ($response->failed()) {
            Log::channel('ai')->error('AI request failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
                'provider' => $provider,
                'base_url' => $baseUrl,
            ]);

            throw new AiServiceException($this->parseErrorMessage($response));
        }

        $content = match ($apiStyle) {
            'anthropic' => data_get($response->json(), 'content.0.text'),
            'gemini' => $this->extractGeminiText($response->json()),
            default => data_get($response->json(), 'choices.0.message.content'),
        };

        if (blank($content)) {
            Log::channel('ai')->warning('AI request returned an empty response.', [
                'body' => $response->body(),
                'provider' => $provider,
            ]);

            throw new AiServiceException('پاسخ نامعتبر یا خالی از سرویس هوش مصنوعی دریافت شد.');
        }

        return trim((string) $content);
    }

    /**
     * @return array{success: bool, message: string, provider?: string, model?: string}
     */
    public function testConnection(?AiSetting $settings = null): array
    {
        $settings ??= AiSetting::current();

        try {
            $reply = $this->chat(
                [['role' => 'user', 'content' => 'فقط با کلمه "سلام" پاسخ بده.']],
                ['max_tokens' => 16],
                $settings
            );

            return [
                'success' => true,
                'message' => 'اتصال با موفقیت برقرار شد. پاسخ آزمایشی: '.$reply,
                'provider' => AiProviderCatalog::label((string) $settings->provider_name),
                'model' => (string) $settings->model,
            ];
        } catch (AiServiceException $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'provider' => AiProviderCatalog::label((string) $settings->provider_name),
                'model' => (string) $settings->model,
            ];
        }
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    private function requestOpenAiCompatible(
        string $baseUrl,
        string $apiKey,
        string $model,
        float $temperature,
        int $maxTokens,
        array $messages,
    ): Response {
        return Http::withToken($apiKey)
            ->timeout(90)
            ->baseUrl($baseUrl)
            ->post('/chat/completions', [
                'model' => $model,
                'messages' => $messages,
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
            ]);
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    private function requestAnthropic(
        string $baseUrl,
        string $apiKey,
        string $model,
        float $temperature,
        int $maxTokens,
        array $messages,
    ): Response {
        $system = collect($messages)
            ->where('role', 'system')
            ->pluck('content')
            ->implode("\n\n");

        $turns = collect($messages)
            ->where('role', '!=', 'system')
            ->map(fn (array $m) => [
                'role' => $m['role'] === 'assistant' ? 'assistant' : 'user',
                'content' => $m['content'],
            ])
            ->values()
            ->all();

        return Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
        ])
            ->timeout(90)
            ->baseUrl($baseUrl)
            ->post('/messages', array_filter([
                'model' => $model,
                'max_tokens' => max(64, $maxTokens),
                'temperature' => $temperature,
                'system' => $system !== '' ? $system : null,
                'messages' => $turns,
            ]));
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    private function requestGemini(
        string $baseUrl,
        string $apiKey,
        string $model,
        float $temperature,
        array $messages,
    ): Response {
        $system = collect($messages)
            ->where('role', 'system')
            ->pluck('content')
            ->implode("\n\n");

        $turns = collect($messages)->where('role', '!=', 'system')->values();
        $contents = $turns->isEmpty()
            ? [['parts' => [['text' => 'Hello']]]]
            : $turns->map(fn (array $m) => [
                'role' => $m['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content']]],
            ])->all();

        $endpoint = '/models/'.rawurlencode($model).':generateContent';

        return Http::withHeaders([
            'X-goog-api-key' => $apiKey,
        ])
            ->timeout(90)
            ->baseUrl($baseUrl)
            ->post($endpoint, array_filter([
                'contents' => $contents,
                'systemInstruction' => $system !== '' ? ['parts' => [['text' => $system]]] : null,
                'generationConfig' => [
                    'temperature' => $temperature,
                ],
            ]));
    }

    private function extractGeminiText(mixed $json): ?string
    {
        $parts = data_get($json, 'candidates.0.content.parts', []);
        if (! is_array($parts)) {
            return null;
        }

        $text = collect($parts)
            ->map(fn ($part) => is_array($part) ? ($part['text'] ?? '') : '')
            ->implode('');

        return $text !== '' ? $text : null;
    }

    private function parseErrorMessage(Response $response): string
    {
        $json = $response->json();
        $message = data_get($json, 'error.message')
            ?? data_get($json, 'message')
            ?? null;

        if (is_string($message) && $message !== '') {
            if (str_contains($message, 'API key') || in_array($response->status(), [401, 403], true)) {
                return 'کلید API نامعتبر یا منقضی شده است.';
            }

            return $message;
        }

        return 'درخواست به سرویس هوش مصنوعی ناموفق بود. کلید API، مدل یا آدرس سرویس را بررسی کنید.';
    }
}
