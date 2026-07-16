<?php

namespace App\Support\Ai;

/**
 * Static catalog of AI providers for family manager + AIService routing.
 */
final class AiProviderCatalog
{
    /** @var array<string, array{id: string, label: string, api_style: string, default_model: string, default_base_url: string, models: string[], key_hint: string, hint: string}> */
    private const PROVIDERS = [
        'openai' => [
            'id' => 'openai',
            'label' => 'ChatGPT (OpenAI)',
            'api_style' => 'openai',
            'default_model' => 'gpt-4o-mini',
            'default_base_url' => 'https://api.openai.com/v1',
            'models' => ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
            'key_hint' => 'sk-...',
            'hint' => 'کلید را از platform.openai.com دریافت کنید.',
        ],
        'gemini' => [
            'id' => 'gemini',
            'label' => 'Gemini (Google)',
            'api_style' => 'gemini',
            'default_model' => 'gemini-2.0-flash',
            'default_base_url' => 'https://generativelanguage.googleapis.com/v1beta',
            'models' => ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'],
            'key_hint' => 'AIza...',
            'hint' => 'کلید را از Google AI Studio (aistudio.google.com) بگیرید.',
        ],
        'anthropic' => [
            'id' => 'anthropic',
            'label' => 'Claude (Anthropic)',
            'api_style' => 'anthropic',
            'default_model' => 'claude-3-5-haiku-latest',
            'default_base_url' => 'https://api.anthropic.com/v1',
            'models' => ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest', 'claude-sonnet-4-20250514'],
            'key_hint' => 'sk-ant-...',
            'hint' => 'کلید را از console.anthropic.com دریافت کنید.',
        ],
        'custom' => [
            'id' => 'custom',
            'label' => 'سفارشی (OpenAI-compatible)',
            'api_style' => 'openai',
            'default_model' => '',
            'default_base_url' => '',
            'models' => [],
            'key_hint' => 'کلید سرویس',
            'hint' => 'برای OpenRouter، LocalAI، Azure OpenAI و سرویس‌های سازگار با OpenAI.',
        ],
    ];

    /** @return list<string> */
    public static function ids(): array
    {
        return array_keys(self::PROVIDERS);
    }

  /** @return array<string, mixed>|null */
    public static function find(string $id): ?array
    {
        return self::PROVIDERS[$id] ?? null;
    }

    public static function apiStyle(string $provider): string
    {
        return self::find($provider)['api_style'] ?? 'openai';
    }

    public static function label(string $provider): string
    {
        return self::find($provider)['label'] ?? $provider;
    }

    /** @return array{model: string, base_url: string} */
    public static function defaults(string $provider): array
    {
        $meta = self::find($provider) ?? self::PROVIDERS['openai'];

        return [
            'model' => (string) $meta['default_model'],
            'base_url' => (string) $meta['default_base_url'],
        ];
    }

    /** Safe payload for admin UI — no secrets. */
    public static function publicCatalog(): array
    {
        return array_values(array_map(fn (array $p) => [
            'id' => $p['id'],
            'label' => $p['label'],
            'api_style' => $p['api_style'],
            'default_model' => $p['default_model'],
            'default_base_url' => $p['default_base_url'],
            'models' => $p['models'],
            'key_hint' => $p['key_hint'],
            'hint' => $p['hint'],
        ], self::PROVIDERS));
    }
}
