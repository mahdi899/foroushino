<?php

namespace App\Services\Sms;

use App\Contracts\SmsProviderContract;
use App\Services\Sms\KavenegarProvider;
use App\Services\Sms\MelipayamakProvider;
use App\Services\Sms\Providers\BaleMessengerProvider;
use App\Services\Sms\Providers\BaleSafirProvider;
use App\Services\Sms\Providers\FarazSmsProvider;
use App\Services\Sms\Providers\IppanelProvider;
use App\Services\Sms\Providers\TelegramMessengerProvider;
use App\Models\SmsProvider;
use App\Models\SmsSetting;

class SmsProviderFactory
{
    /** @var array<string, class-string<SmsProviderContract>> */
    private const REGISTRY = [
        'melipayamak' => MelipayamakProvider::class,
        'kavenegar' => KavenegarProvider::class,
        'farazsms' => FarazSmsProvider::class,
        'ippanel' => IppanelProvider::class,
        'bale' => BaleMessengerProvider::class,
        'bale_safir' => BaleSafirProvider::class,
        'telegram' => TelegramMessengerProvider::class,
    ];

    public function make(string $slug, ?string $patternCode = null): ?SmsProviderContract
    {
        $provider = SmsProvider::query()->where('slug', $slug)->first();

        if ($provider?->isReady()) {
            return $this->fromProvider($provider, $patternCode);
        }

        return $this->fromLegacySettings($slug, $patternCode);
    }

    public function fromProvider(SmsProvider $provider, ?string $patternCode = null): ?SmsProviderContract
    {
        $class = self::REGISTRY[$provider->slug] ?? null;

        if (! $class) {
            return null;
        }

        $config = new SmsProviderConfig(
            slug: $provider->slug,
            credentials: $provider->credentials,
            senderNumber: $provider->sender_number,
            patternCode: $patternCode,
            baseUrl: $provider->base_url,
        );

        return new $class($config);
    }

    /** @return list<string> */
    public function registeredSlugs(): array
    {
        return array_keys(self::REGISTRY);
    }

    private function fromLegacySettings(string $slug, ?string $patternCode = null): ?SmsProviderContract
    {
        if (! isset(self::REGISTRY[$slug])) {
            return null;
        }

        $settings = SmsSetting::current();

        if (! $settings->isReady() || ($settings->sms_provider ?? 'melipayamak') !== $slug) {
            return null;
        }

        $config = new SmsProviderConfig(
            slug: $slug,
            credentials: $settings->sms_api_key,
            senderNumber: $settings->sms_sender_number,
            patternCode: $patternCode ?? $settings->sms_pattern_code,
        );

        $class = self::REGISTRY[$slug];

        return new $class($config);
    }
}
