<?php

namespace Tests\Feature\Telegram;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Database\Seeders\TelegramBotSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookTest extends TestCase
{
    use RefreshDatabase;

    private TelegramBot $bot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TelegramBotSeeder::class);
        $this->bot = TelegramBot::query()->where('key', 'production')->firstOrFail();
    }

    /** Headers a correctly configured Cloudflare Worker would inject. */
    private function proxyHeaders(string $telegramSecret = 'test-secret'): array
    {
        return [
            'Authorization' => 'Bearer test-proxy-token',
            'X-Proxy-Origin' => 'Cloudflare-Worker',
            'X-Telegram-Bot-Api-Secret-Token' => $telegramSecret,
        ];
    }

    public function test_webhook_accepts_valid_update_with_secret(): void
    {
        $payload = [
            'update_id' => 1001,
            'message' => [
                'message_id' => 1,
                'from' => ['id' => 42, 'first_name' => 'Test'],
                'chat' => ['id' => 42, 'type' => 'private'],
                'text' => '/start',
            ],
        ];

        $response = $this->postJson(
            '/api/v1/integrations/telegram/production/webhook',
            $payload,
            $this->proxyHeaders(),
        );

        $response->assertOk()->assertJson(['ok' => true]);

        $this->assertDatabaseHas('telegram_updates', [
            'telegram_bot_id' => $this->bot->id,
            'update_id' => 1001,
            'status' => UpdateStatus::Processed->value,
        ]);
    }

    public function test_webhook_rejects_invalid_secret(): void
    {
        $response = $this->postJson(
            '/api/v1/integrations/telegram/production/webhook',
            ['update_id' => 1002, 'message' => ['text' => 'hi']],
            $this->proxyHeaders('wrong-secret'),
        );

        $response->assertForbidden();
        $this->assertDatabaseCount('telegram_updates', 0);
    }

    public function test_webhook_rejects_requests_missing_proxy_origin_headers(): void
    {
        // Simulates a request that hit rostami.app directly, bypassing the
        // Cloudflare Worker — must be dropped before the Telegram secret is
        // even inspected.
        $response = $this->postJson(
            '/api/v1/integrations/telegram/production/webhook',
            ['update_id' => 1003, 'message' => ['text' => 'hi']],
            ['X-Telegram-Bot-Api-Secret-Token' => 'test-secret'],
        );

        $response->assertForbidden();
        $this->assertDatabaseCount('telegram_updates', 0);
    }

    public function test_webhook_rejects_wrong_proxy_shared_token(): void
    {
        $response = $this->postJson(
            '/api/v1/integrations/telegram/production/webhook',
            ['update_id' => 1004, 'message' => ['text' => 'hi']],
            [
                'Authorization' => 'Bearer not-the-shared-token',
                'X-Proxy-Origin' => 'Cloudflare-Worker',
                'X-Telegram-Bot-Api-Secret-Token' => 'test-secret',
            ],
        );

        $response->assertForbidden();
        $this->assertDatabaseCount('telegram_updates', 0);
    }

    public function test_duplicate_update_is_idempotent(): void
    {
        $payload = [
            'update_id' => 2001,
            'message' => [
                'message_id' => 2,
                'from' => ['id' => 99, 'first_name' => 'Dup'],
                'chat' => ['id' => 99, 'type' => 'private'],
                'text' => 'hello',
            ],
        ];

        $headers = $this->proxyHeaders();

        $this->postJson('/api/v1/integrations/telegram/production/webhook', $payload, $headers)
            ->assertOk();

        $this->postJson('/api/v1/integrations/telegram/production/webhook', $payload, $headers)
            ->assertOk();

        $this->assertSame(1, TelegramUpdate::query()->where('update_id', 2001)->count());
    }
}
