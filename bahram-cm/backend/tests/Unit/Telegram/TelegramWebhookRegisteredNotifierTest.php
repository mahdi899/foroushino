<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramWebhookRegisteredNotifier;
use Database\Seeders\TelegramBotSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramWebhookRegisteredNotifierTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_message_to_payment_reports_chat_when_configured(): void
    {
        $this->seed(TelegramBotSeeder::class);
        $fake = new FakeTelegramBotClient;
        $this->app->instance(FakeTelegramBotClient::class, $fake);

        $bot = TelegramBot::query()->where('key', 'production')->firstOrFail();
        $bot->setPaymentReportsChatId('-1001234567890');

        app(TelegramWebhookRegisteredNotifier::class)->notify(
            $bot,
            'https://bridge.example.workers.dev/api/v1/integrations/telegram/production/webhook',
            'Cloudflare Worker',
        );

        $this->assertTrue($fake->wasCalled('getMe'));
        $this->assertTrue($fake->wasCalled('sendMessage'));
        $this->assertSame('-1001234567890', $fake->calls[1]['arguments']['chat_id']);
        $this->assertStringContainsString('وب‌هوک ربات ثبت شد', $fake->calls[1]['arguments']['text']);
        $this->assertStringContainsString('Cloudflare Worker', $fake->calls[1]['arguments']['text']);
    }

    public function test_skips_notification_when_no_reports_chat_configured(): void
    {
        $this->seed(TelegramBotSeeder::class);
        $fake = new FakeTelegramBotClient;
        $this->app->instance(FakeTelegramBotClient::class, $fake);

        $bot = TelegramBot::query()->where('key', 'production')->firstOrFail();
        $bot->forceFill([
            'reports_chat_id' => null,
            'support_group_chat_id' => null,
            'settings' => [],
        ])->save();

        app(TelegramWebhookRegisteredNotifier::class)->notify($bot, 'https://example.com/webhook');

        $this->assertFalse($fake->wasCalled('sendMessage'));
    }
}
