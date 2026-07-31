<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramHostPayloadBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramHostPayloadBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_bootstrap_payload_reflects_all_feature_flags(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Production',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $bot->setFeatureEnabled(BotFeatureFlag::ReferralEnabled, false);
        $bot->setFeatureEnabled(BotFeatureFlag::SupportEnabled, false);
        $bot->setFeatureEnabled(BotFeatureFlag::IranMobileOnly, false);
        $bot->setFeatureEnabled(BotFeatureFlag::TicketRequiresSubscription, true);
        $bot->setFeatureEnabled(BotFeatureFlag::ZarinpalPayment, false);
        $bot->setFeatureEnabled(BotFeatureFlag::CardToCardPayment, true);
        $bot->setFeatureEnabled(BotFeatureFlag::SmsOtpVerification, true);
        $bot->setFeatureEnabled(BotFeatureFlag::CollectPhoneAndName, false);
        $bot->setFeatureEnabled(BotFeatureFlag::SatEnabled, false);

        $payload = app(TelegramHostPayloadBuilder::class)->bootstrapPayload($bot->fresh());
        $features = (array) ($payload['bot']['features'] ?? []);

        $this->assertFalse($features[BotFeatureFlag::ReferralEnabled->value]);
        $this->assertFalse($features[BotFeatureFlag::SupportEnabled->value]);
        $this->assertFalse($features[BotFeatureFlag::IranMobileOnly->value]);
        $this->assertTrue($features[BotFeatureFlag::TicketRequiresSubscription->value]);
        $this->assertFalse($features[BotFeatureFlag::ZarinpalPayment->value]);
        $this->assertTrue($features[BotFeatureFlag::CardToCardPayment->value]);
        $this->assertTrue($features[BotFeatureFlag::SmsOtpVerification->value]);
        $this->assertFalse($features[BotFeatureFlag::CollectPhoneAndName->value]);
        $this->assertFalse($features[BotFeatureFlag::SatEnabled->value]);
    }

    public function test_bootstrap_payload_includes_bot_active_state(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Production',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => false,
        ]);

        $payload = app(TelegramHostPayloadBuilder::class)->bootstrapPayload($bot);

        $this->assertFalse($payload['bot']['is_active']);
    }

    public function test_checkout_flags_follow_payment_feature_toggles(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Production',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $bot->setFeatureEnabled(BotFeatureFlag::ZarinpalPayment, false);
        $bot->setFeatureEnabled(BotFeatureFlag::CardToCardPayment, true);

        $payload = app(TelegramHostPayloadBuilder::class)->bootstrapPayload($bot->fresh());

        $this->assertFalse($payload['checkout']['zarinpal_enabled']);
        $this->assertTrue($payload['checkout']['c2c_enabled']);
    }
}
