<?php

namespace Tests\Unit\Telegram;

use App\Models\User;
use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationInviteLink;
use App\Modules\TelegramBot\Models\TelegramDestinationLeaveEvent;
use App\Modules\TelegramBot\Models\TelegramDestinationMembership;
use App\Modules\TelegramBot\Services\DestinationMembershipAuditService;
use App\Services\AdminTelegramLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DestinationMembershipAuditServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_left_member_creates_event_releases_account_and_revokes_invite(): void
    {
        Queue::fake();

        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $user = User::factory()->create(['mobile' => '09123334455']);
        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 555666,
            'user_id' => $user->id,
            'mobile' => $user->mobile,
            'mobile_verified_at' => now(),
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'مرجع',
            'chat_id' => '-100999',
            'access_mode' => 'per_user',
            'is_active' => true,
        ]);

        TelegramDestinationMembership::query()->create([
            'user_id' => $user->id,
            'telegram_destination_id' => $destination->id,
            'is_member' => true,
            'checked_at' => now()->subDay(),
        ]);

        TelegramDestinationInviteLink::query()->create([
            'telegram_destination_id' => $destination->id,
            'user_id' => $user->id,
            'telegram_account_id' => $account->id,
            'telegram_user_id' => $account->telegram_user_id,
            'invite_link' => 'https://t.me/+leave-test',
        ]);

        $fake = new FakeTelegramBotClient;
        $fake->queueResponse('getChatMember', ['status' => 'left']);
        $this->app->instance(FakeTelegramBotClient::class, $fake);

        $admin = \Mockery::mock(AdminTelegramLogService::class);
        $admin->shouldReceive('notify')->once();
        $this->app->instance(AdminTelegramLogService::class, $admin);

        $result = app(DestinationMembershipAuditService::class)->run();

        $this->assertSame(1, $result['checked']);
        $this->assertSame(1, $result['left']);
        $this->assertSame(1, $result['released']);

        $this->assertSame(1, TelegramDestinationLeaveEvent::query()->count());
        $event = TelegramDestinationLeaveEvent::query()->first();
        $this->assertSame($user->id, $event->user_id);
        $this->assertTrue($event->account_released);
        $this->assertSame('left', $event->previous_status);

        $account->refresh();
        $this->assertNull($account->user_id);
        $this->assertNull($account->mobile);

        $invite = TelegramDestinationInviteLink::query()->first();
        $this->assertNotNull($invite->revoked_at);
        $this->assertTrue($fake->wasCalled('revokeChatInviteLink'));

        $membership = TelegramDestinationMembership::query()->first();
        $this->assertFalse($membership->is_member);
    }
}
