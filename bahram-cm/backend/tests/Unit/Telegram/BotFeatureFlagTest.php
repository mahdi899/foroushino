<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BotFeatureFlagTest extends TestCase
{
    use RefreshDatabase;

    public function test_defaults_and_toggle_persist_in_settings(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $this->assertTrue($bot->featureEnabled(BotFeatureFlag::ZarinpalPayment));
        $this->assertFalse($bot->featureEnabled(BotFeatureFlag::CardToCardPayment));
        $this->assertTrue($bot->featureEnabled(BotFeatureFlag::IranMobileOnly));
        $this->assertFalse($bot->featureEnabled(BotFeatureFlag::TicketRequiresSubscription));
        $this->assertTrue($bot->featureEnabled(BotFeatureFlag::SupportEnabled));

        $this->assertTrue($bot->toggleFeature(BotFeatureFlag::CardToCardPayment));
        $this->assertTrue($bot->fresh()->featureEnabled(BotFeatureFlag::CardToCardPayment));

        $this->assertFalse($bot->fresh()->toggleFeature(BotFeatureFlag::ZarinpalPayment));
        $this->assertFalse($bot->fresh()->featureEnabled(BotFeatureFlag::ZarinpalPayment));
    }

    public function test_set_feature_enabled_persists_in_settings(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'staging',
            'display_name' => 'Staging',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'staging',
            'is_active' => true,
        ]);

        $bot->setFeatureEnabled(BotFeatureFlag::IranMobileOnly, false);
        $this->assertFalse($bot->fresh()->featureEnabled(BotFeatureFlag::IranMobileOnly));

        $bot->setFeatureEnabled(BotFeatureFlag::IranMobileOnly, true);
        $this->assertTrue($bot->fresh()->featureEnabled(BotFeatureFlag::IranMobileOnly));
    }

    public function test_card_to_card_free_text_parses_into_config(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $bot->setCardToCardInstructions(
            "شماره کارت: 6037-9912-3456-7890\nبه‌نام: علی رضایی\nبانک: ملی",
        );

        $config = $bot->fresh()->cardToCardConfig();
        $this->assertSame('6037991234567890', $config['card_number']);
        $this->assertSame('علی رضایی', $config['card_holder']);
        $this->assertSame('ملی', $config['bank_name']);
        $this->assertStringContainsString('6037', $config['override_text']);
    }

    public function test_card_to_card_parses_persian_digits_and_plain_card_line(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $bot->setCardToCardInstructions("۶۰۳۷۹۹۱۲۳۴۵۶۷۸۹۰\nبه‌نام: سارا");

        $config = $bot->fresh()->cardToCardConfig();
        $this->assertSame('6037991234567890', $config['card_number']);
        $this->assertSame('سارا', $config['card_holder']);
    }
}
