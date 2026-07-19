<?php

namespace Tests\Feature\Telegram;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\TelegramBotSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TelegramGrantBotAdminTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(TelegramBotSeeder::class);
        $this->admin = User::factory()->create(['is_admin' => true]);
        $this->admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($this->admin);
    }

    public function test_admin_can_grant_bot_admin_by_telegram_user_id(): void
    {
        $bot = TelegramBot::query()->where('key', 'production')->firstOrFail();

        $this->postJson('/api/v1/panel/telegram/accounts/grant-bot-admin', [
            'telegram_user_id' => 303360676,
            'bot_admin_rank' => 'super',
            'display_name' => 'پشتیبانی',
        ])->assertOk()
            ->assertJsonPath('data.telegram_user_id', 303360676)
            ->assertJsonPath('data.is_bot_admin', true)
            ->assertJsonPath('data.bot_admin_rank', 'super');

        $account = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('telegram_user_id', 303360676)
            ->first();

        $this->assertNotNull($account);
        $this->assertTrue($account->is_bot_admin);
        $this->assertSame('super', $account->bot_admin_rank?->value);
        $this->assertSame('پشتیبانی', data_get($account->metadata, 'bot_admin_display_name'));
    }
}
