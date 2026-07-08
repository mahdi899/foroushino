<?php

namespace Database\Seeders;

use App\Enums\SmsChannelType;
use App\Enums\SmsEventKey;
use App\Models\SmsEventConfig;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use Illuminate\Database\Seeder;

class SmsCenterSeeder extends Seeder
{
    public function run(): void
    {
        $settings = SmsSetting::current();

        $providers = [
            [
                'slug' => 'melipayamak',
                'label_fa' => 'ملی‌پیامک',
                'channel_type' => SmsChannelType::Sms,
                'docs_url' => 'https://www.melipayamak.com/api',
                'sort_order' => 1,
            ],
            [
                'slug' => 'kavenegar',
                'label_fa' => 'کاوه‌نگار',
                'channel_type' => SmsChannelType::Sms,
                'docs_url' => 'https://kavenegar.com/rest.html',
                'sort_order' => 2,
            ],
            [
                'slug' => 'farazsms',
                'label_fa' => 'فراز اس‌ام‌اس',
                'channel_type' => SmsChannelType::Sms,
                'docs_url' => 'https://farazsms.com',
                'sort_order' => 3,
            ],
            [
                'slug' => 'ippanel',
                'label_fa' => 'آی‌پی‌پنل',
                'channel_type' => SmsChannelType::Sms,
                'docs_url' => 'https://ippanel.com',
                'sort_order' => 4,
            ],
            [
                'slug' => 'bale',
                'label_fa' => 'ربات بله',
                'channel_type' => SmsChannelType::Messenger,
                'docs_url' => 'https://dev.bale.ai',
                'sort_order' => 5,
            ],
            [
                'slug' => 'telegram',
                'label_fa' => 'ربات تلگرام',
                'channel_type' => SmsChannelType::Messenger,
                'docs_url' => 'https://core.telegram.org/bots/api',
                'sort_order' => 6,
            ],
        ];

        foreach ($providers as $row) {
            $isLegacy = $settings->sms_provider === $row['slug'] && filled($settings->sms_api_key);

            SmsProvider::query()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'label_fa' => $row['label_fa'],
                    'channel_type' => $row['channel_type'],
                    'docs_url' => $row['docs_url'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => $isLegacy,
                    'credentials' => $isLegacy ? $settings->sms_api_key : null,
                    'sender_number' => $isLegacy ? $settings->sms_sender_number : null,
                ],
            );
        }

        $settings->update([
            'primary_provider_slug' => $settings->primary_provider_slug ?? $settings->sms_provider ?? 'melipayamak',
            'fallback_provider_slug' => $settings->fallback_provider_slug
                ?? (($settings->sms_provider ?? 'melipayamak') === 'melipayamak' ? 'kavenegar' : 'melipayamak'),
            'fallback_delay_seconds' => $settings->fallback_delay_seconds ?? 20,
            'fallback_enabled' => $settings->fallback_enabled ?? true,
        ]);

        $purchaseTemplate = $settings->purchase_message_template;

        foreach (SmsEventKey::configurable() as $index => $event) {
            $existing = SmsEventConfig::query()->where('event_key', $event->value)->first();

            SmsEventConfig::query()->updateOrCreate(
                ['event_key' => $event->value],
                [
                    'label_fa' => $event->label(),
                    'description' => $event->description(),
                    'is_enabled' => $existing?->is_enabled ?? $event->defaultEnabled(),
                    'message_template' => $event === SmsEventKey::PurchaseConfirmation && filled($purchaseTemplate)
                        ? $purchaseTemplate
                        : ($existing?->message_template ?? $event->defaultTemplate()),
                    'pattern_code' => $existing?->pattern_code,
                    'use_pattern' => $existing?->use_pattern ?? false,
                    'provider_slug' => $existing?->provider_slug,
                    'fallback_enabled' => $existing?->fallback_enabled ?? $event->defaultFallbackEnabled(),
                    'fallback_delay_seconds' => $existing?->fallback_delay_seconds ?? ($event === SmsEventKey::Otp ? 20 : null),
                    'sort_order' => $index + 1,
                ],
            );
        }
    }
}
