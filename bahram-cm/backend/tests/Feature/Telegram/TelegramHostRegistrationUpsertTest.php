<?php

namespace Tests\Feature\Telegram;

use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Services\TelegramHostRegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TelegramHostRegistrationUpsertTest extends TestCase
{
    use RefreshDatabase;

    private TelegramBot $bot;

    private TelegramHostRegistrationService $hostRegistration;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();

        $this->bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $this->hostRegistration = app(TelegramHostRegistrationService::class);
    }

    public function test_upsert_completes_registration_when_host_finished_locally_first(): void
    {
        $telegramUserId = 555001;
        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => $telegramUserId,
            'mobile' => '09123334455',
            'first_name' => 'Test',
        ]);
        $conversation = app(ConversationService::class)->forAccount($account);
        app(ConversationService::class)->transition($conversation, ConversationState::Idle, [
            'mobile' => '09123334455',
        ]);

        $result = $this->hostRegistration->upsertRegistration(
            $this->bot,
            $telegramUserId,
            '09123334455',
            'علی رستمی',
            $telegramUserId,
        );

        $this->assertTrue($result['ok'] ?? false);
        $this->assertSame('idle', $result['conversation']['state'] ?? null);
        $this->assertNotEmpty($result['account']['mobile_verified_at'] ?? null);
        $this->assertSame('علی رستمی', $result['account']['display_name'] ?? null);
    }

    public function test_submit_name_is_idempotent_when_conversation_state_is_idle_but_mobile_is_set(): void
    {
        $telegramUserId = 555002;
        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => $telegramUserId,
            'mobile' => '09124445566',
            'first_name' => 'Test',
        ]);
        $conversation = app(ConversationService::class)->forAccount($account);
        app(ConversationService::class)->transition($conversation, ConversationState::Idle, [
            'mobile' => '09124445566',
        ]);

        $result = $this->hostRegistration->submitName($this->bot, $telegramUserId, 'سارا احمدی');

        $this->assertTrue($result['ok'] ?? false);
        $this->assertSame('idle', $result['conversation']['state'] ?? null);
        $this->assertNotEmpty($result['account']['mobile_verified_at'] ?? null);
        $this->assertSame('سارا احمدی', $result['account']['display_name'] ?? null);
    }
}
