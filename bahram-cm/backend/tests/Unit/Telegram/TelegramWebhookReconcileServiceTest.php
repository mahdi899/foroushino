<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramWebhookReconcileService;
use App\Services\SettingService;
use App\Services\TelegramInfrastructureService;
use Database\Seeders\TelegramBotSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class TelegramWebhookReconcileServiceTest extends TestCase
{
    use RefreshDatabase;

    private FakeTelegramBotClient $fake;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TelegramBotSeeder::class);
        $this->fake = $this->app->make(FakeTelegramBotClient::class);
        Cache::flush();

        putenv('TELEGRAM_BOT_TOKEN=test-token');
        $_ENV['TELEGRAM_BOT_TOKEN'] = 'test-token';
        $_SERVER['TELEGRAM_BOT_TOKEN'] = 'test-token';

        app(SettingService::class)->updateGroup('telegram', [
            'infrastructure' => [
                'webhook_secret' => 'test-secret',
                'base_url' => 'https://worker.test',
                'backend_origin' => 'https://rostami.test',
                'proxy_shared_token' => 'test-proxy-token',
            ],
        ]);
        TelegramInfrastructureService::forgetCachedConfig();
    }

    public function test_reconcile_syncs_bot_secret_when_only_infrastructure_has_value(): void
    {
        TelegramBot::query()->where('key', 'production')->update(['webhook_secret' => null]);

        $this->fake->queueResponse('getWebhookInfo', [
            'url' => 'https://worker.test/api/v1/integrations/telegram/production/webhook',
            'pending_update_count' => 0,
            'last_error_message' => '',
        ]);

        $result = app(TelegramWebhookReconcileService::class)->reconcile('production');

        $this->assertContains('synced_webhook_secret', $result['actions']);
        $this->assertSame('test-secret', TelegramBot::query()->where('key', 'production')->value('webhook_secret'));
    }

    public function test_reconcile_pulls_remote_backlog_when_pending_and_error_reported(): void
    {
        TelegramBot::query()->where('key', 'production')->update(['webhook_secret' => 'test-secret']);

        $this->fake->queueResponse('getWebhookInfo', [
            'url' => 'https://worker.test/api/v1/integrations/telegram/production/webhook',
            'pending_update_count' => 10,
            'last_error_message' => 'Wrong response from the webhook: 403 Forbidden',
        ]);
        $this->fake->queueResponse('getUpdates', [[
            'update_id' => 9001,
            'message' => [
                'message_id' => 1,
                'from' => ['id' => 42, 'first_name' => 'Test'],
                'chat' => ['id' => 42, 'type' => 'private'],
                'text' => '/start',
            ],
        ]]);
        $this->fake->queueResponse('getUpdates', []);
        $this->fake->queueResponse('getWebhookInfo', [
            'url' => 'https://worker.test/api/v1/integrations/telegram/production/webhook',
            'pending_update_count' => 0,
            'last_error_message' => '',
        ]);

        $result = app(TelegramWebhookReconcileService::class)->reconcile('production');

        $this->assertTrue($this->fake->wasCalled('deleteWebhook'));
        $this->assertTrue($this->fake->wasCalled('getUpdates'));
        $this->assertTrue($this->fake->wasCalled('setWebhook'));
        $this->assertContains('pulled_remote_updates:1', $result['actions']);
        $this->assertDatabaseHas('telegram_updates', ['update_id' => 9001]);
    }
}
