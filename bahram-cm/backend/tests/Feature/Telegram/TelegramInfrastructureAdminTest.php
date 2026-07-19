<?php

namespace Tests\Feature\Telegram;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\SettingService;
use App\Services\TelegramInfrastructureService;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\TelegramBotSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TelegramInfrastructureAdminTest extends TestCase
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

    public function test_admin_can_save_worker_settings_from_panel(): void
    {
        $this->patchJson('/api/v1/panel/telegram/infrastructure', [
            'worker_url' => 'https://bridge.example.workers.dev',
            'connection_token_input' => str_repeat('a', 32),
        ])->assertOk()
            ->assertJsonPath('data.configured', true)
            ->assertJsonPath('data.mode', 'worker')
            ->assertJsonPath('data.worker_url', 'https://bridge.example.workers.dev');

        $stored = app(SettingService::class)->group(TelegramInfrastructureService::GROUP)[TelegramInfrastructureService::KEY] ?? [];
        $this->assertSame('https://bridge.example.workers.dev', $stored['base_url'] ?? null);
    }

    public function test_admin_can_save_direct_mode(): void
    {
        config(['bahram.frontend_url' => 'https://site.example.com']);

        $this->patchJson('/api/v1/panel/telegram/infrastructure', [
            'mode' => 'direct',
            'worker_url' => 'https://ignored.example.workers.dev',
        ])->assertOk()
            ->assertJsonPath('data.configured', true)
            ->assertJsonPath('data.mode', 'direct')
            ->assertJsonPath('data.worker_url', '');

        $stored = app(SettingService::class)->group(TelegramInfrastructureService::GROUP)[TelegramInfrastructureService::KEY] ?? [];
        $this->assertSame(TelegramInfrastructureService::DEFAULT_BASE_URL, $stored['base_url'] ?? null);
    }

    public function test_worker_mode_requires_url(): void
    {
        $this->patchJson('/api/v1/panel/telegram/infrastructure', [
            'mode' => 'worker',
            'worker_url' => '',
        ])->assertStatus(422);
    }

    public function test_admin_can_save_bot_token_on_bot(): void
    {
        $bot = TelegramBot::query()->where('key', 'production')->firstOrFail();

        $this->patchJson("/api/v1/panel/telegram/bots/{$bot->id}", [
            'bot_token_input' => '123456:ABC-DEF',
        ])->assertOk()
            ->assertJsonPath('data.token_present', true);

        $this->assertSame('123456:ABC-DEF', $bot->fresh()->panelToken());
    }
}
