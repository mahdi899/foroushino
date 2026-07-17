<?php

namespace Tests\Feature\Telegram;

use App\Models\User;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Jobs\SendTelegramMessageJob;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\RegistrationFlowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RegistrationPhoneFirstTest extends TestCase
{
    use RefreshDatabase;

    private TelegramBot $bot;

    private TelegramAccount $account;

    private TelegramConversation $conversation;

    private RegistrationFlowService $flow;

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

        $this->account = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => 303360676,
            'first_name' => 'Mahdi',
        ]);

        $this->conversation = app(ConversationService::class)->forAccount($this->account);
        $this->flow = app(RegistrationFlowService::class);
    }

    public function test_start_asks_for_contact_share_not_name(): void
    {
        $this->flow->start($this->bot, $this->account, $this->conversation);

        $this->conversation->refresh();
        $this->assertSame(ConversationState::WaitingForMobile, $this->conversation->state);

        Queue::assertPushed(SendTelegramMessageJob::class, function (SendTelegramMessageJob $job): bool {
            return str_contains($job->text, 'شماره موبایل')
                && ($job->options['reply_markup']['keyboard'][0][0]['request_contact'] ?? false) === true;
        });
    }

    public function test_shared_contact_of_existing_user_greets_with_db_name(): void
    {
        User::query()->create([
            'name' => 'مهدی اکبری',
            'mobile' => '09145416413',
            'password' => bcrypt('secret'),
        ]);

        app(ConversationService::class)->transition($this->conversation, ConversationState::WaitingForMobile);

        $this->flow->handleContact($this->bot, $this->account, $this->conversation->fresh(), [
            'from' => ['id' => 303360676],
            'contact' => [
                'phone_number' => '+989145416413',
                'first_name' => 'Mahdi',
                'user_id' => 303360676,
            ],
        ]);

        $this->account->refresh();
        $this->conversation->refresh();

        $this->assertSame('09145416413', $this->account->mobile);
        $this->assertSame('مهدی اکبری', $this->account->display_name);
        $this->assertNotNull($this->account->mobile_verified_at);
        $this->assertSame(ConversationState::Idle, $this->conversation->state);

        Queue::assertPushed(SendTelegramMessageJob::class, function (SendTelegramMessageJob $job): bool {
            return str_contains($job->text, 'مهدی اکبری') && str_contains($job->text, 'پیدا شد');
        });
        Queue::assertPushed(SendTelegramMessageJob::class, function (SendTelegramMessageJob $job): bool {
            return str_contains($job->text, 'ثبت‌نام با موفقیت');
        });
    }

    public function test_shared_contact_of_unknown_user_asks_for_name(): void
    {
        app(ConversationService::class)->transition($this->conversation, ConversationState::WaitingForMobile);

        $this->flow->handleContact($this->bot, $this->account, $this->conversation->fresh(), [
            'from' => ['id' => 303360676],
            'contact' => [
                'phone_number' => '09120001122',
                'first_name' => 'New',
                'user_id' => 303360676,
            ],
        ]);

        $this->account->refresh();
        $this->conversation->refresh();

        $this->assertSame('09120001122', $this->account->mobile);
        $this->assertSame(ConversationState::WaitingForName, $this->conversation->state);

        Queue::assertPushed(SendTelegramMessageJob::class, function (SendTelegramMessageJob $job): bool {
            return str_contains($job->text, 'نام و نام خانوادگی');
        });
    }

    public function test_rejects_someone_elses_contact(): void
    {
        app(ConversationService::class)->transition($this->conversation, ConversationState::WaitingForMobile);

        $this->flow->handleContact($this->bot, $this->account, $this->conversation->fresh(), [
            'from' => ['id' => 303360676],
            'contact' => [
                'phone_number' => '09121112233',
                'first_name' => 'Other',
                'user_id' => 999999,
            ],
        ]);

        $this->conversation->refresh();
        $this->assertSame(ConversationState::WaitingForMobile, $this->conversation->state);
        $this->assertNull($this->account->fresh()->mobile);
    }

    public function test_back_from_name_step_returns_to_phone_share(): void
    {
        $this->account->update(['mobile' => '09120001122']);
        app(ConversationService::class)->transition($this->conversation, ConversationState::WaitingForName, [
            'mobile' => '09120001122',
        ]);

        $this->flow->handleText($this->bot, $this->account, $this->conversation->fresh(), '↩️ بازگشت');

        $this->conversation->refresh();
        $this->assertSame(ConversationState::WaitingForMobile, $this->conversation->state);

        Queue::assertPushed(SendTelegramMessageJob::class, function (SendTelegramMessageJob $job): bool {
            return ($job->options['reply_markup']['keyboard'][0][0]['request_contact'] ?? false) === true;
        });
    }
}
