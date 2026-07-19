<?php

namespace App\Services;

use App\Enums\AdminTelegramEventCategory;
use App\Enums\AdminTelegramEventKey;
use App\Enums\SmsChannelType;
use App\Enums\SmsEventCategory;
use App\Enums\SmsEventKey;
use App\Models\AdminTelegramEventConfig;
use App\Models\SmsEventConfig;
use App\Services\AdminTelegramLogService;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\Sms\SmsProviderFactory;
use App\Services\TelegramInfrastructureService;

class SmsCenterConfigService
{
    public function __construct(
        private readonly SmsProviderFactory $providerFactory,
        private readonly TelegramInfrastructureService $telegramInfrastructure,
    ) {}

    /** @return array<string, mixed> */
    public function globalView(): array
    {
        $settings = SmsSetting::current();

        return [
            'is_sms_active' => $settings->is_sms_active,
            'primary_provider_slug' => $settings->primary_provider_slug ?? $settings->sms_provider ?? 'melipayamak',
            'fallback_provider_slug' => $settings->fallback_provider_slug,
            'fallback_delay_seconds' => $settings->fallback_delay_seconds ?? 20,
            'fallback_enabled' => $settings->fallback_enabled ?? true,
            'test_phone' => $settings->test_phone,
            'admin_telegram_enabled' => (bool) $settings->admin_telegram_enabled,
            'admin_telegram_chat_ids' => $settings->admin_telegram_chat_ids,
        ];
    }

    /** @param  array<string, mixed>  $input */
    public function updateGlobal(array $input): array
    {
        $settings = SmsSetting::current();
        $settings->update(array_intersect_key($input, array_flip([
            'is_sms_active',
            'primary_provider_slug',
            'fallback_provider_slug',
            'fallback_delay_seconds',
            'fallback_enabled',
            'test_phone',
            'admin_telegram_enabled',
            'admin_telegram_chat_ids',
        ])));

        if (isset($input['primary_provider_slug'])) {
            $settings->update(['sms_provider' => $input['primary_provider_slug']]);
        }

        return $this->globalView();
    }

    /** @return list<array<string, mixed>> */
    public function providersView(): array
    {
        $telegramDefaults = $this->telegramProviderDefaults();

        return SmsProvider::query()->orderBy('sort_order')->get()->map(function (SmsProvider $p) use ($telegramDefaults) {
            $row = [
                'slug' => $p->slug,
                'label_fa' => $p->label_fa,
                'channel_type' => $p->channelType()->value,
                'channel_label' => $p->channelType()->label(),
                'docs_url' => $p->docs_url,
                'sender_number' => $p->sender_number,
                'base_url' => $p->base_url,
                'is_active' => $p->is_active,
                'configured' => $p->isReady(),
                'has_credentials' => filled($p->credentials),
                'credential_hint' => $this->credentialHint($p),
            ];

            if ($p->slug === 'telegram') {
                $row['suggested_base_url'] = $telegramDefaults['base_url'];
                if (! filled($p->credentials) && filled($telegramDefaults['bot_token'])) {
                    $row['suggested_credentials'] = $telegramDefaults['bot_token'];
                }
            }

            return $row;
        })->all();
    }

    /** @return array{base_url: string, bot_token: string|null} */
    private function telegramProviderDefaults(): array
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();

        return [
            'base_url' => TelegramInfrastructureService::DEFAULT_BASE_URL,
            'bot_token' => filled($bot?->resolveToken()) ? (string) $bot->resolveToken() : null,
        ];
    }

    /** @param  array<string, mixed>  $input */
    public function updateProvider(string $slug, array $input): array
    {
        $provider = SmsProvider::query()->where('slug', $slug)->firstOrFail();

        $patch = [];

        if (array_key_exists('sender_number', $input)) {
            $patch['sender_number'] = $input['sender_number'];
        }

        if (array_key_exists('base_url', $input)) {
            $patch['base_url'] = trim((string) $input['base_url']) ?: null;
        }

        if (array_key_exists('is_active', $input)) {
            $patch['is_active'] = (bool) $input['is_active'];
        }

        if (array_key_exists('credentials_input', $input)) {
            $raw = trim((string) $input['credentials_input']);
            if ($raw !== '') {
                $patch['credentials'] = $raw;
            }
        }

        if ($patch !== []) {
            $provider->update($patch);
        }

        $fresh = $provider->fresh();

        return [
            'slug' => $fresh->slug,
            'label_fa' => $fresh->label_fa,
            'channel_type' => $fresh->channelType()->value,
            'channel_label' => $fresh->channelType()->label(),
            'docs_url' => $fresh->docs_url,
            'sender_number' => $fresh->sender_number,
            'base_url' => $fresh->base_url,
            'is_active' => $fresh->is_active,
            'configured' => $fresh->isReady(),
            'has_credentials' => filled($fresh->credentials),
            'credential_hint' => $this->credentialHint($fresh),
        ];
    }

    /** @return array{ok: bool, message: string} */
    public function testProvider(string $slug): array
    {
        $adapter = $this->providerFactory->make($slug);

        if (! $adapter) {
            return ['ok' => false, 'message' => 'پنل پیامکی تنظیم یا فعال نشده است.'];
        }

        $result = $adapter->testConnection();

        return ['ok' => $result['success'], 'message' => $result['message']];
    }

    /** @return list<array<string, mixed>> */
    public function eventsView(): array
    {
        return SmsEventConfig::query()->orderBy('sort_order')->get()->map(function (SmsEventConfig $event) {
            $key = $event->eventKey();

            return [
                'event_key' => $event->event_key,
                'category' => $key?->category()->value ?? SmsEventCategory::Manual->value,
                'category_label' => $key?->category()->label() ?? SmsEventCategory::Manual->label(),
                'label_fa' => $event->label_fa,
                'description' => $event->description,
                'is_enabled' => $event->is_enabled,
                'message_template' => $event->message_template,
                'resolved_template' => $event->resolvedTemplate(),
                'pattern_code' => $event->pattern_code,
                'use_pattern' => $event->use_pattern,
                'provider_slug' => $event->provider_slug,
                'fallback_enabled' => $event->fallback_enabled,
                'fallback_delay_seconds' => $event->fallback_delay_seconds,
                'placeholders' => $key?->placeholders() ?? [],
            ];
        })->all();
    }

    /** @param  array<string, mixed>  $input */
    public function updateEvent(string $eventKey, array $input): array
    {
        $event = SmsEventConfig::query()->where('event_key', $eventKey)->firstOrFail();

        $event->update(array_intersect_key($input, array_flip([
            'is_enabled',
            'message_template',
            'pattern_code',
            'use_pattern',
            'provider_slug',
            'fallback_enabled',
            'fallback_delay_seconds',
        ])));

        if ($eventKey === SmsEventKey::PurchaseConfirmation->value && array_key_exists('message_template', $input)) {
            SmsSetting::current()->update(['purchase_message_template' => $input['message_template']]);
        }

        $event->refresh();
        $key = $event->eventKey();

        return [
            'event_key' => $event->event_key,
            'category' => $key?->category()->value ?? SmsEventCategory::Manual->value,
            'category_label' => $key?->category()->label() ?? SmsEventCategory::Manual->label(),
            'label_fa' => $event->label_fa,
            'description' => $event->description,
            'is_enabled' => $event->is_enabled,
            'message_template' => $event->message_template,
            'resolved_template' => $event->resolvedTemplate(),
            'pattern_code' => $event->pattern_code,
            'use_pattern' => $event->use_pattern,
            'provider_slug' => $event->provider_slug,
            'fallback_enabled' => $event->fallback_enabled,
            'fallback_delay_seconds' => $event->fallback_delay_seconds,
            'placeholders' => $key?->placeholders() ?? [],
        ];
    }

    /** @return list<array<string, mixed>> */
    public function adminTelegramEventsView(): array
    {
        return AdminTelegramEventConfig::query()->orderBy('sort_order')->get()->map(function (AdminTelegramEventConfig $event) {
            $key = $event->eventKey();

            return [
                'event_key' => $event->event_key,
                'category' => $key?->category()->value ?? AdminTelegramEventCategory::Commerce->value,
                'category_label' => $key?->category()->label() ?? AdminTelegramEventCategory::Commerce->label(),
                'label_fa' => $event->label_fa,
                'description' => $event->description,
                'is_enabled' => $event->is_enabled,
            ];
        })->all();
    }

    /** @param  array<string, mixed>  $input */
    public function updateAdminTelegramEvent(string $eventKey, array $input): array
    {
        $event = AdminTelegramEventConfig::query()->where('event_key', $eventKey)->firstOrFail();
        $event->update(array_intersect_key($input, array_flip(['is_enabled'])));
        $event->refresh();
        $key = $event->eventKey();

        return [
            'event_key' => $event->event_key,
            'category' => $key?->category()->value ?? AdminTelegramEventCategory::Commerce->value,
            'category_label' => $key?->category()->label() ?? AdminTelegramEventCategory::Commerce->label(),
            'label_fa' => $event->label_fa,
            'description' => $event->description,
            'is_enabled' => $event->is_enabled,
        ];
    }

    /** @return list<array<string, mixed>> */
    public function adminTelegramCategoriesView(): array
    {
        return collect(AdminTelegramEventCategory::cases())
            ->sortBy(fn (AdminTelegramEventCategory $c) => $c->sortOrder())
            ->map(fn (AdminTelegramEventCategory $c) => [
                'key' => $c->value,
                'label' => $c->label(),
            ])
            ->values()
            ->all();
    }

    /** @return array{ok: bool, message: string} */
    public function testAdminTelegram(): array
    {
        $result = app(AdminTelegramLogService::class)->sendTest();

        return ['ok' => $result['success'], 'message' => $result['message']];
    }

    /** @return list<array<string, mixed>> */
    public function eventCategoriesView(): array
    {
        return collect(SmsEventCategory::cases())
            ->sortBy(fn (SmsEventCategory $c) => $c->sortOrder())
            ->map(fn (SmsEventCategory $c) => [
                'key' => $c->value,
                'label' => $c->label(),
            ])
            ->values()
            ->all();
    }

    /** @return array<string, mixed>|null */
    public function telegramInfrastructureView(): ?array
    {
        return $this->telegramInfrastructure->adminView();
    }

    public function telegramWorkerSampleTemplate(): ?string
    {
        return $this->telegramInfrastructure->workerSampleTemplate();
    }

    private function credentialHint(SmsProvider $provider): ?string
    {
        if (! filled($provider->credentials)) {
            return null;
        }

        if ($provider->slug === 'melipayamak') {
            $username = explode(':', (string) $provider->credentials, 2)[0] ?? '';

            return $username !== '' ? $username : 'ثبت‌شده';
        }

        if ($provider->slug === 'bale_safir' && filled($provider->sender_number)) {
            return 'bot_id: '.$provider->sender_number;
        }

        $value = (string) $provider->credentials;

        return strlen($value) > 8 ? substr($value, 0, 6).'…' : 'ثبت‌شده';
    }
}
