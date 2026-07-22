<?php

namespace Tests\Feature\Telegram;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\TelegramBotSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TelegramDestinationAdminTest extends TestCase
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

    public function test_admin_can_create_sat_destination_with_membership_requirement(): void
    {
        $bot = TelegramBot::query()->firstOrFail();

        $this->postJson('/api/v1/panel/telegram/destinations', [
            'bot_key' => $bot->key,
            'title' => 'گروه پشتیبانی سات',
            'chat_id' => '-1001234567890',
            'access_mode' => 'per_user',
            'is_active' => true,
            'requirements' => [
                [
                    'requirement_type' => 'sat_membership',
                    'requirement_value' => 'active',
                ],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'گروه پشتیبانی سات')
            ->assertJsonPath('data.requirements.0.requirement_type', 'sat_membership');

        $this->assertDatabaseHas('telegram_destination_requirements', [
            'requirement_type' => 'sat_membership',
            'requirement_value' => 'active',
        ]);
    }

    public function test_admin_can_add_sat_requirement_to_existing_destination(): void
    {
        $bot = TelegramBot::query()->firstOrFail();
        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه سات',
            'chat_id' => '-1009876543210',
            'chat_type' => 'supergroup',
            'access_mode' => 'per_user',
            'is_active' => true,
            'welcome_inside_chat' => false,
        ]);

        $this->postJson("/api/v1/panel/telegram/destinations/{$destination->id}/requirements", [
            'requirement_type' => 'sat_membership',
            'requirement_value' => 'active',
        ])
            ->assertCreated()
            ->assertJsonPath('data.requirement_type', 'sat_membership');
    }
}
