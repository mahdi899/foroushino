<?php

namespace Tests\Feature\Telegram;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\SettingService;
use App\Services\TelegramInfrastructureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramHostTokenAuthTest extends TestCase
{
    use RefreshDatabase;

    private const SYNC_SECRET = '01234567890123456789012345678901';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'security.proxy_origin.allowed_values' => [
                'Cloudflare-Worker',
                'Internal-Sync',
                'Telegram-Host-App',
                'Main-Server',
            ],
        ]);

        app(SettingService::class)->updateGroup(TelegramInfrastructureService::GROUP, [
            TelegramInfrastructureService::KEY => [
                'bridge_type' => 'host',
                'base_url' => 'https://host.example.com/telegram',
                'host_sync_secret' => self::SYNC_SECRET,
            ],
        ]);
        TelegramInfrastructureService::forgetCachedConfig();

        TelegramBot::query()->firstOrCreate(
            ['key' => 'production'],
            [
                'display_name' => 'Production',
                'username' => 'test_bot',
                'token_key' => 'test-token',
                'webhook_secret' => 'test-webhook-secret',
                'environment' => 'production',
                'is_active' => true,
            ],
        );
    }

    public function test_account_fetch_rejects_missing_bearer(): void
    {
        $response = $this->postJson('/api/v1/integrations/telegram-host/account/fetch', [
            'telegram_user_id' => 1,
        ], [
            'X-Proxy-Origin' => 'Telegram-Host-App',
        ]);

        $response->assertStatus(403);
    }

    public function test_account_fetch_rejects_wrong_bearer(): void
    {
        $response = $this->postJson('/api/v1/integrations/telegram-host/account/fetch', [
            'telegram_user_id' => 1,
        ], [
            'X-Proxy-Origin' => 'Telegram-Host-App',
            'Authorization' => 'Bearer wrong-token',
        ]);

        $response->assertStatus(403);
    }

    public function test_account_fetch_accepts_plain_json_with_valid_token(): void
    {
        $response = $this->withHeaders([
            'X-Proxy-Origin' => 'Telegram-Host-App',
            'Authorization' => 'Bearer '.self::SYNC_SECRET,
        ])->postJson('/api/v1/integrations/telegram-host/account/fetch', [
            'telegram_user_id' => 999999999,
            'include_snapshot' => false,
        ]);

        $response->assertOk();
        $response->assertJsonPath('found', false);
        $this->assertArrayNotHasKey('payload', $response->json());
    }

    public function test_account_fetch_auto_syncs_production_bot_when_missing_from_database(): void
    {
        TelegramBot::query()->where('key', 'production')->delete();
        $this->assertNull(TelegramBot::query()->where('key', 'production')->first());

        $response = $this->withHeaders([
            'X-Proxy-Origin' => 'Telegram-Host-App',
            'Authorization' => 'Bearer '.self::SYNC_SECRET,
        ])->postJson('/api/v1/integrations/telegram-host/account/fetch', [
            'telegram_user_id' => 999999999,
            'include_snapshot' => false,
        ]);

        $response->assertOk();
        $response->assertJsonPath('found', false);
        $this->assertNotNull(TelegramBot::query()->where('key', 'production')->first());
    }
}
