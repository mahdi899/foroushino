<?php

namespace Tests\Unit\Telegram;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramHostPushService;
use App\Services\TelegramHostReregisterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class TelegramHostReregisterServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_soft_reregister_clears_mobile_but_preserves_user_id(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $user = User::factory()->create(['mobile' => '09123334444']);
        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 555001,
            'user_id' => $user->id,
            'mobile' => '09125556666',
            'mobile_verified_at' => now(),
        ]);

        $push = Mockery::mock(TelegramHostPushService::class);
        $push->shouldReceive('resetRegistration')->once()->with(555001, '09125556666')->andReturn(true);
        $push->shouldReceive('revokeMobileAccess')->once()->with('09125556666')->andReturn(true);
        $push->shouldReceive('notifyUser')->once();
        $this->app->instance(TelegramHostPushService::class, $push);

        $ok = app(TelegramHostReregisterService::class)->softReregister($account->fresh(), $user);

        $this->assertTrue($ok);
        $account->refresh();
        $this->assertNull($account->mobile);
        $this->assertNull($account->mobile_verified_at);
        $this->assertSame($user->id, $account->user_id);
        $this->assertNotEmpty($account->metadata['reregister_at'] ?? null);
    }
}
