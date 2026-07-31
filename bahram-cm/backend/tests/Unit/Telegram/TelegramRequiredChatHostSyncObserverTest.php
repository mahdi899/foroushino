<?php

namespace Tests\Unit\Telegram;

use App\Jobs\PushTelegramHostSyncJob;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class TelegramRequiredChatHostSyncObserverTest extends TestCase
{
    use RefreshDatabase;

    public function test_toggling_required_status_pushes_bootstrap_to_host(): void
    {
        Bus::fake();

        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Production',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $chat = TelegramRequiredChat::query()->create([
            'telegram_bot_id' => $bot->id,
            'chat_id' => '-1001234567890',
            'title' => 'کانال تست',
            'invite_link' => 'https://t.me/+test',
            'is_required' => true,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $chat->update(['is_required' => false]);

        Bus::assertDispatched(PushTelegramHostSyncJob::class, function (PushTelegramHostSyncJob $job): bool {
            return $job->action === 'refresh_bootstrap';
        });
    }
}
