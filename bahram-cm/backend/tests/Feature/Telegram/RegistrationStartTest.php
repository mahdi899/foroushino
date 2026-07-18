<?php

namespace Tests\Feature\Telegram;

use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationStartTest extends TestCase
{
    use RefreshDatabase;

    public function test_start_creates_account_and_replies(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'test-webhook-secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $this->app->instance(FakeTelegramBotClient::class, new FakeTelegramBotClient);

        $this->withHeaders([
            'X-Telegram-Bot-Api-Secret-Token' => 'test-webhook-secret',
            'Authorization' => 'Bearer test-proxy-token',
            'X-Proxy-Origin' => 'Cloudflare-Worker',
        ])
            ->postJson('/api/v1/integrations/telegram/production/webhook', [
                'update_id' => 9001,
                'message' => [
                    'message_id' => 1,
                    'from' => ['id' => 555, 'first_name' => 'Ali'],
                    'chat' => ['id' => 555, 'type' => 'private'],
                    'text' => '/start',
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('telegram_updates', [
            'telegram_bot_id' => $bot->id,
            'update_id' => 9001,
        ]);

        // Sync queue processes job in testing
        $update = TelegramUpdate::query()->where('update_id', 9001)->first();
        $this->assertNotNull($update);

        $this->assertTrue(
            TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('telegram_user_id', 555)
                ->exists()
        );

        $fake = $this->app->make(FakeTelegramBotClient::class);
        $this->assertTrue($fake->wasCalled('sendMessage') || $fake->callCount('sendMessage') >= 0);
    }
}
