<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Enums\BotAdminPermission;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BotAdminPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_permissions_toggle_and_permanent_full_access(): void
    {
        config([
            'telegram_bot.permanent_admins.telegram_user_ids' => [97343715],
            'telegram_bot.permanent_admins.usernames' => ['pvamin'],
        ]);

        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $permanent = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 97343715,
            'telegram_username' => 'PVamin',
            'is_bot_admin' => true,
        ]);

        $staff = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 111,
            'telegram_username' => 'staff',
            'is_bot_admin' => true,
            'metadata' => ['bot_admin_permissions' => [BotAdminPermission::UserInfo->value]],
        ]);

        $this->assertTrue($permanent->hasBotAdminPermission(BotAdminPermission::Broadcast));
        $this->assertTrue($staff->hasBotAdminPermission(BotAdminPermission::UserInfo));
        $this->assertFalse($staff->hasBotAdminPermission(BotAdminPermission::Broadcast));

        $staff->toggleBotAdminPermission(BotAdminPermission::Broadcast);
        $this->assertTrue($staff->fresh()->hasBotAdminPermission(BotAdminPermission::Broadcast));

        $staff->toggleBotAdminPermission(BotAdminPermission::Broadcast);
        $this->assertFalse($staff->fresh()->hasBotAdminPermission(BotAdminPermission::Broadcast));
    }
}
