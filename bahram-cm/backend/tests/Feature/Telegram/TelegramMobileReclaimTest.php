<?php

namespace Tests\Feature\Telegram;

use App\Models\User;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\AccountLinkService;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Services\TelegramHostRegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TelegramMobileReclaimTest extends TestCase
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

    public function test_share_contact_reclaims_verified_account_when_telegram_user_id_changes(): void
    {
        $user = User::query()->create([
            'name' => 'احسان تست',
            'mobile' => '09121234567',
            'password' => bcrypt('secret'),
        ]);

        $legacy = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => 100,
            'user_id' => $user->id,
            'display_name' => 'احسان تست',
            'mobile' => '09121234567',
            'mobile_verified_at' => now(),
            'first_name' => 'Ehsan',
        ]);
        app(ConversationService::class)->forAccount($legacy);

        $result = $this->hostRegistration->shareContact(
            $this->bot,
            telegramUserId: 200,
            phone: '09121234567',
            contactUserId: 200,
        );

        $this->assertTrue($result['ok'] ?? false);
        $this->assertSame('idle', $result['conversation']['state'] ?? null);
        $this->assertSame(200, (int) ($result['account']['telegram_user_id'] ?? 0));
        $this->assertSame('09121234567', $result['account']['mobile'] ?? null);

        $this->assertSame(1, TelegramAccount::query()->where('telegram_bot_id', $this->bot->id)->count());
        $this->assertSame(1, TelegramAccount::query()->where('mobile', '09121234567')->count());

        $reclaimed = TelegramAccount::query()->where('mobile', '09121234567')->first();
        $this->assertNotNull($reclaimed);
        $this->assertSame($legacy->id, $reclaimed->id);
        $this->assertSame(200, (int) $reclaimed->telegram_user_id);
        $this->assertSame($user->id, (int) $reclaimed->user_id);
        $this->assertNotNull($reclaimed->mobile_verified_at);

        $replyText = (string) ($result['replies'][0]['text'] ?? '');
        $this->assertStringContainsString('احسان تست', $replyText);
        $this->assertStringContainsString('پیدا شد', $replyText);
        $this->assertStringNotContainsString('نام و نام خانوادگی', $replyText);
    }

    public function test_account_link_service_reclaim_updates_telegram_user_id_and_drops_stub(): void
    {
        $user = User::query()->create([
            'name' => 'کاربر قبلی',
            'mobile' => '09129876543',
            'password' => bcrypt('secret'),
        ]);

        $legacy = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => 111,
            'user_id' => $user->id,
            'display_name' => 'کاربر قبلی',
            'mobile' => '09129876543',
            'mobile_verified_at' => now(),
        ]);

        $stub = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => 222,
            'first_name' => 'New',
        ]);

        $links = app(AccountLinkService::class);
        $result = $links->reclaimVerifiedAccountByMobile($this->bot, $stub, '09129876543', [
            'first_name' => 'NewName',
        ]);

        $this->assertSame($legacy->id, $result->id);
        $this->assertSame(222, (int) $result->telegram_user_id);
        $this->assertSame('NewName', $result->first_name);
        $this->assertNull(TelegramAccount::query()->find($stub->id));
        $this->assertSame(1, TelegramAccount::query()->where('telegram_bot_id', $this->bot->id)->count());
    }

    public function test_share_contact_new_mobile_still_asks_for_name(): void
    {
        $result = $this->hostRegistration->shareContact(
            $this->bot,
            telegramUserId: 303,
            phone: '09120009988',
            contactUserId: 303,
        );

        $this->assertTrue($result['ok'] ?? false);
        $this->assertSame(ConversationState::WaitingForName->value, $result['conversation']['state'] ?? null);
        $replyText = (string) ($result['replies'][0]['text'] ?? '');
        $this->assertStringContainsString('نام و نام خانوادگی', $replyText);
    }
}
