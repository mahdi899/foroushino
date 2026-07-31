<?php

namespace Tests\Feature\Telegram;

use App\Modules\TelegramBot\Models\TelegramAccount;
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

    public function test_account_fetch_finds_verified_account_by_mobile(): void
    {
        $bot = TelegramBot::query()->where('key', 'production')->firstOrFail();
        TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 111111111,
            'mobile' => '09123456789',
            'mobile_verified_at' => now(),
            'display_name' => 'تست موبایل',
        ]);

        $response = $this->withHeaders([
            'X-Proxy-Origin' => 'Telegram-Host-App',
            'Authorization' => 'Bearer '.self::SYNC_SECRET,
        ])->postJson('/api/v1/integrations/telegram-host/account/fetch', [
            'mobile' => '09123456789',
            'telegram_user_id' => 222222222,
            'include_snapshot' => false,
        ]);

        $response->assertOk();
        $response->assertJsonPath('found', true);
        $response->assertJsonPath('account.mobile', '09123456789');
        $response->assertJsonPath('account.telegram_user_id', 222222222);
        $this->assertSame(1, TelegramAccount::query()->where('mobile', '09123456789')->count());
    }

    public function test_account_fetch_accepts_mobile_only_without_telegram_user_id(): void
    {
        $bot = TelegramBot::query()->where('key', 'production')->firstOrFail();
        TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 333333333,
            'mobile' => '09129876543',
            'mobile_verified_at' => now(),
            'display_name' => 'فقط موبایل',
        ]);

        $response = $this->withHeaders([
            'X-Proxy-Origin' => 'Telegram-Host-App',
            'Authorization' => 'Bearer '.self::SYNC_SECRET,
        ])->postJson('/api/v1/integrations/telegram-host/account/fetch', [
            'mobile' => '09129876543',
            'include_snapshot' => false,
        ]);

        $response->assertOk();
        $response->assertJsonPath('found', true);
        $response->assertJsonPath('account.telegram_user_id', 333333333);
    }
}
