<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermanentBotAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_configured_usernames_and_ids_are_always_admins(): void
    {
        config([
            'telegram_bot.permanent_admins.telegram_user_ids' => [97343715, 303360676],
            'telegram_bot.permanent_admins.usernames' => ['pvamin', 'mahdi_akbari'],
        ]);

        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $amin = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 97343715,
            'telegram_username' => 'PVamin',
            'is_bot_admin' => false,
        ]);

        $mahdi = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 303360676,
            'telegram_username' => 'mahdi_akbari',
            'is_bot_admin' => false,
        ]);

        $this->assertTrue($amin->isPermanentBotAdmin());
        $this->assertTrue($amin->isBotAdmin());
        $this->assertTrue($mahdi->isPermanentBotAdmin());
        $this->assertTrue($mahdi->isBotAdmin());

        $amin->syncPermanentAdminFlag();
        $this->assertTrue($amin->fresh()->is_bot_admin);
    }
}
