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

        $this->assertTrue($bot->toggleFeature(BotFeatureFlag::CardToCardPayment));
        $this->assertTrue($bot->fresh()->featureEnabled(BotFeatureFlag::CardToCardPayment));

        $this->assertFalse($bot->fresh()->toggleFeature(BotFeatureFlag::ZarinpalPayment));
        $this->assertFalse($bot->fresh()->featureEnabled(BotFeatureFlag::ZarinpalPayment));
    }
}
