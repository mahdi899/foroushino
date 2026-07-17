<?php

namespace App\Services\Family;

use App\Models\AiSetting;
use App\Models\Setting;
use App\Support\Ai\AiProviderCatalog;
use Illuminate\Support\Facades\Cache;

/** Panel-managed AI settings for family manager (moderation + post drafting). */
class FamilyAiSettingsService
{
    public const GROUP = 'family';

    public const KEY = 'ai';

    private const CACHE_KEY = 'family.ai.config';

    /** @return array<string, mixed> */
    private function stored(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            $raw = Setting::query()
                ->where('group', self::GROUP)
                ->where('key', self::KEY)
                ->value('value');

            return is_array($raw) ? $raw : [];
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function isActive(): bool
    {
        if (array_key_exists('is_active', $this->stored())) {
            return filter_var($this->stored()['is_active'], FILTER_VALIDATE_BOOL);
        }

        return AiSetting::current()->isReady();
    }

    public function autoApproveComments(): bool
    {
        return filter_var($this->stored()['auto_approve_comments'] ?? true, FILTER_VALIDATE_BOOL);
    }

    public function autoRejectHighRisk(): bool
    {
        return filter_var($this->stored()['auto_reject_high_risk'] ?? true, FILTER_VALIDATE_BOOL);
    }

    public function riskApproveThreshold(): float
    {
        return (float) ($this->stored()['risk_approve_threshold'] ?? 0.35);
    }

    public function riskRejectThreshold(): float
    {
        return (float) ($this->stored()['risk_reject_threshold'] ?? 0.75);
    }

    public function defaultActionDays(): int
    {
        return max(1, (int) ($this->stored()['default_action_days'] ?? 7));
    }

    /** @return array<string, mixed> */
    public function adminView(): array
    {
        $ai = AiSetting::current();
        $provider = (string) ($this->stored()['provider_name'] ?? $ai->provider_name ?? 'openai');
        if (! in_array($provider, AiProviderCatalog::ids(), true)) {
            $provider = 'openai';
        }

        return [
            'is_active' => $this->isActive(),
            'provider_name' => $provider,
            'provider_label' => AiProviderCatalog::label($provider),
            'api_style' => AiProviderCatalog::apiStyle($provider),
            'base_url' => (string) ($this->stored()['base_url'] ?? $ai->base_url ?? AiProviderCatalog::defaults($provider)['base_url']),
            'model' => (string) ($this->stored()['model'] ?? $ai->model ?? AiProviderCatalog::defaults($provider)['model']),
            'temperature' => (float) ($this->stored()['temperature'] ?? $ai->temperature ?? 0.4),
            'max_tokens' => (int) ($this->stored()['max_tokens'] ?? $ai->max_tokens ?? 1200),
            'has_api_key' => filled($this->stored()['api_key'] ?? null) || filled($ai->api_key),
            'auto_approve_comments' => $this->autoApproveComments(),
            'auto_reject_high_risk' => $this->autoRejectHighRisk(),
            'risk_approve_threshold' => $this->riskApproveThreshold(),
            'risk_reject_threshold' => $this->riskRejectThreshold(),
            'default_action_days' => $this->defaultActionDays(),
        ];
    }

    /** @param  array<string, mixed>  $payload */
    public function update(array $payload): void
    {
        $current = $this->stored();
        $next = array_merge($current, array_filter([
            'is_active' => array_key_exists('is_active', $payload)
                ? filter_var($payload['is_active'], FILTER_VALIDATE_BOOL)
                : null,
            'provider_name' => $payload['provider_name'] ?? null,
            'base_url' => $payload['base_url'] ?? null,
            'model' => $payload['model'] ?? null,
            'temperature' => array_key_exists('temperature', $payload) ? (float) $payload['temperature'] : null,
            'max_tokens' => array_key_exists('max_tokens', $payload) ? (int) $payload['max_tokens'] : null,
            'api_key' => $payload['api_key'] ?? null,
            'auto_approve_comments' => array_key_exists('auto_approve_comments', $payload)
                ? filter_var($payload['auto_approve_comments'], FILTER_VALIDATE_BOOL)
                : null,
            'auto_reject_high_risk' => array_key_exists('auto_reject_high_risk', $payload)
                ? filter_var($payload['auto_reject_high_risk'], FILTER_VALIDATE_BOOL)
                : null,
            'risk_approve_threshold' => array_key_exists('risk_approve_threshold', $payload)
                ? (float) $payload['risk_approve_threshold']
                : null,
            'risk_reject_threshold' => array_key_exists('risk_reject_threshold', $payload)
                ? (float) $payload['risk_reject_threshold']
                : null,
            'default_action_days' => array_key_exists('default_action_days', $payload)
                ? max(1, (int) $payload['default_action_days'])
                : null,
        ], fn ($v) => $v !== null));

        if (($payload['clear_api_key'] ?? false) === true) {
            unset($next['api_key']);
        }

        $previousProvider = (string) ($current['provider_name'] ?? 'openai');
        if (isset($payload['provider_name']) && (string) $payload['provider_name'] !== $previousProvider) {
            $provider = (string) $payload['provider_name'];
            if (in_array($provider, AiProviderCatalog::ids(), true)) {
                $defaults = AiProviderCatalog::defaults($provider);
                if (! array_key_exists('base_url', $payload)) {
                    $next['base_url'] = $defaults['base_url'];
                }
                if (! array_key_exists('model', $payload)) {
                    $next['model'] = $defaults['model'];
                }
            }
        }

        Setting::query()->updateOrCreate(
            ['group' => self::GROUP, 'key' => self::KEY],
            ['value' => $next],
        );

        self::forgetCachedConfig();
        $this->syncAiSetting($next);
    }

    /** @param  array<string, mixed>  $config */
    private function syncAiSetting(array $config): void
    {
        $ai = AiSetting::current();
        $apiKey = filled($config['api_key'] ?? null) ? (string) $config['api_key'] : $ai->api_key;

        $ai->update([
            'provider_name' => (string) ($config['provider_name'] ?? $ai->provider_name ?? 'openai'),
            'base_url' => (string) ($config['base_url'] ?? $ai->base_url ?? ''),
            'model' => (string) ($config['model'] ?? $ai->model ?? 'gpt-4o-mini'),
            'temperature' => (float) ($config['temperature'] ?? $ai->temperature ?? 0.4),
            'max_tokens' => (int) ($config['max_tokens'] ?? $ai->max_tokens ?? 1200),
            'is_active' => filter_var($config['is_active'] ?? true, FILTER_VALIDATE_BOOL),
            ...(filled($apiKey) ? ['api_key' => $apiKey] : []),
        ]);
    }
}
