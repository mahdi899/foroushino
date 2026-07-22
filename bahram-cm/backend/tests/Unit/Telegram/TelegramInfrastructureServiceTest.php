<?php

namespace Tests\Unit\Telegram;

use App\Services\SettingService;
use App\Services\TelegramInfrastructureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramInfrastructureServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_builds_webhook_url_on_worker_base_url(): void
    {
        config(['bahram.frontend_url' => 'https://site.example.com']);

        app(SettingService::class)->updateGroup(TelegramInfrastructureService::GROUP, [
            TelegramInfrastructureService::KEY => [
                'bridge_type' => 'worker',
                'base_url' => 'https://bridge.example.workers.dev',
                'proxy_shared_token' => str_repeat('a', 32),
            ],
        ]);
        TelegramInfrastructureService::forgetCachedConfig();

        $service = app(TelegramInfrastructureService::class);

        $this->assertTrue($service->usesWorkerBridge());
        $this->assertSame('https://bridge.example.workers.dev', $service->workerUrl());
        $this->assertSame(
            'https://bridge.example.workers.dev/api/v1/integrations/telegram/production/webhook',
            $service->buildWebhookUrl('production'),
        );
        $this->assertSame(
            'https://site.example.com/api/v1/integrations/telegram/production/webhook',
            $service->buildServerWebhookUrl('production'),
        );
        $this->assertSame('https://bridge.example.workers.dev', $service->telegramApiBaseUrl());
        $this->assertTrue($service->isConfigured());
    }

    public function test_direct_mode_uses_site_origin_for_webhook(): void
    {
        config(['bahram.frontend_url' => 'https://site.example.com']);

        app(SettingService::class)->updateGroup(TelegramInfrastructureService::GROUP, [
            TelegramInfrastructureService::KEY => [
                'base_url' => TelegramInfrastructureService::DEFAULT_BASE_URL,
            ],
        ]);
        TelegramInfrastructureService::forgetCachedConfig();

        $service = app(TelegramInfrastructureService::class);

        $this->assertFalse($service->usesWorkerBridge());
        $this->assertSame('', $service->workerUrl());
        $this->assertSame(TelegramInfrastructureService::DEFAULT_BASE_URL, $service->telegramApiBaseUrl());
        $this->assertTrue($service->isConfigured());
        $this->assertSame(
            'https://site.example.com/api/v1/integrations/telegram/production/webhook',
            $service->buildServerWebhookUrl('production'),
        );
    }

    public function test_rejects_short_connection_token(): void
    {
        $service = app(TelegramInfrastructureService::class);

        $this->expectException(\InvalidArgumentException::class);
        $service->update(['connection_token_input' => 'short']);
    }

    public function test_host_mode_uses_public_webhook_and_direct_telegram_api(): void
    {
        config(['bahram.frontend_url' => 'https://site.example.com']);

        app(SettingService::class)->updateGroup(TelegramInfrastructureService::GROUP, [
            TelegramInfrastructureService::KEY => [
                'bridge_type' => 'host',
                'base_url' => 'https://bahram.rahai.online/rostam/telegram',
                'host_sync_secret' => str_repeat('a', 32),
                'host_encryption_key' => base64_encode(random_bytes(32)),
            ],
        ]);
        TelegramInfrastructureService::forgetCachedConfig();

        $service = app(TelegramInfrastructureService::class);

        $this->assertTrue($service->usesHostBridge());
        $this->assertFalse($service->usesWorkerBridge());
        $this->assertSame(
            'https://bahram.rahai.online/rostam/telegram/public/webhook.php',
            $service->buildWebhookUrl('production'),
        );
        $this->assertSame(TelegramInfrastructureService::DEFAULT_BASE_URL, $service->telegramApiBaseUrl());
        $this->assertTrue($service->isConfigured());
    }
}
