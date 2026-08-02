<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Handlers\ChatJoinRequestHandler;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramJoinRequest;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatJoinRequestNonDestinationTest extends TestCase
{
    use RefreshDatabase;

    public function test_join_request_for_non_destination_chat_is_ignored(): void
    {
        $fake = new FakeTelegramBotClient;
        $this->app->instance(FakeTelegramBotClient::class, $fake);

        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $update = TelegramUpdate::query()->create([
            'telegram_bot_id' => $bot->id,
            'update_id' => random_int(10000, 99999),
            'update_type' => 'chat_join_request',
            'payload' => [
                'update_id' => 1,
                'chat_join_request' => [
                    'chat' => ['id' => -100999888777],
                    'from' => ['id' => 123456789],
                    'user_chat_id' => 123456789,
                    'date' => time(),
                ],
            ],
        ]);

        app(ChatJoinRequestHandler::class)->handle($update, $bot);

        $this->assertFalse($fake->wasCalled('declineChatJoinRequest'));
        $this->assertFalse($fake->wasCalled('approveChatJoinRequest'));
        $this->assertFalse($fake->wasCalled('sendMessage'));
        $this->assertSame(0, TelegramJoinRequest::query()->count());
    }
}
