<?php

namespace Tests\Unit\Telegram;

use App\Jobs\PushTelegramHostSyncJob;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class BotAdminSettingsToggleTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_feature_flag_can_be_toggled_and_read_back(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Production',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        foreach (BotFeatureFlag::cases() as $flag) {
            $expected = ! $flag->defaultEnabled();
            $bot->setFeatureEnabled($flag, $expected);
            $this->assertSame(
                $expected,
                $bot->fresh()->featureEnabled($flag),
                'Flag '.$flag->value.' did not persist.',
            );
        }
    }

    public function test_toggle_feature_flips_value(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Production',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $this->assertFalse($bot->toggleFeature(BotFeatureFlag::ReferralEnabled));
        $this->assertFalse($bot->fresh()->featureEnabled(BotFeatureFlag::ReferralEnabled));
        $this->assertTrue($bot->fresh()->toggleFeature(BotFeatureFlag::ReferralEnabled));
        $this->assertTrue($bot->fresh()->featureEnabled(BotFeatureFlag::ReferralEnabled));
    }

    public function test_host_bootstrap_job_can_be_dispatched_for_settings_changes(): void
    {
        Bus::fake();

        PushTelegramHostSyncJob::bootstrap();

        Bus::assertDispatched(PushTelegramHostSyncJob::class, function (PushTelegramHostSyncJob $job): bool {
            return $job->action === 'refresh_bootstrap';
        });
    }
}
