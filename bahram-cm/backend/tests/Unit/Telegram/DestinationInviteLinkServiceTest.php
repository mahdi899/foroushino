<?php

namespace Tests\Unit\Telegram;

use App\Models\CourseAccess;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationInviteLink;
use App\Modules\TelegramBot\Services\DestinationInviteLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DestinationInviteLinkServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_and_reuses_per_user_invite_link(): void
    {
        [$bot, $account, $destination] = $this->seedDestination('per_user');

        $service = app(DestinationInviteLinkService::class);

        $first = $service->resolveInviteUrl($bot, $destination, $account);
        $second = $service->resolveInviteUrl($bot, $destination, $account);

        $this->assertSame('https://t.me/+fake', $first);
        $this->assertSame($first, $second);
        $this->assertSame(1, TelegramDestinationInviteLink::query()->count());
    }

    public function test_shared_mode_auto_generates_join_request_link(): void
    {
        [$bot, $account, $destination] = $this->seedDestination('join_request', withStoredUrl: false);

        $url = app(DestinationInviteLinkService::class)->resolveInviteUrl($bot, $destination, $account);

        $this->assertSame('https://t.me/+fake', $url);
        $this->assertSame('https://t.me/+fake', $destination->fresh()->join_request_url);
        $this->assertSame(0, TelegramDestinationInviteLink::query()->count());
    }

    public function test_shared_mode_uses_existing_join_request_url(): void
    {
        [$bot, $account, $destination] = $this->seedDestination('join_request', withStoredUrl: true);

        $url = app(DestinationInviteLinkService::class)->resolveInviteUrl($bot, $destination, $account);

        $this->assertSame('https://t.me/+shared', $url);
    }

    public function test_member_does_not_receive_invite_link(): void
    {
        [$bot, $account, $destination] = $this->seedDestination('per_user');
        $fake = new FakeTelegramBotClient;
        $fake->queueResponse('getChatMember', ['status' => 'member']);
        $this->app->instance(FakeTelegramBotClient::class, $fake);

        $resolved = app(DestinationInviteLinkService::class)->resolveForAccount($bot, $destination, $account);

        $this->assertNotNull($resolved);
        $this->assertSame('member', $resolved['status']);
        $this->assertNull($resolved['invite_url']);
    }

    public function test_revokes_per_user_link_after_join(): void
    {
        [$bot, $account, $destination] = $this->seedDestination('per_user');
        $service = app(DestinationInviteLinkService::class);
        $fake = $this->app->make(FakeTelegramBotClient::class);

        $url = $service->resolveInviteUrl($bot, $destination, $account);
        $this->assertNotNull($url);

        $service->revokeAfterSuccessfulJoin($bot, $destination, $account);

        $record = TelegramDestinationInviteLink::query()->first();
        $this->assertNotNull($record?->revoked_at);
        $this->assertTrue($fake->wasCalled('revokeChatInviteLink'));
    }

    /**
     * @return array{0: TelegramBot, 1: TelegramAccount, 2: TelegramDestination}
     */
    private function seedDestination(string $accessMode, bool $withStoredUrl = false): array
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $user = User::factory()->create();
        $product = Product::query()->create([
            'title' => 'سات',
            'slug' => 'sat-course-'.$accessMode.($withStoredUrl ? '-stored' : '-fresh'),
            'price' => 1000000,
            'is_active' => true,
        ]);
        CourseAccess::query()->create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'active',
        ]);

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => random_int(100000, 999999),
            'user_id' => $user->id,
            'mobile' => '09120000000',
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه سات',
            'chat_id' => '-100'.random_int(100, 999),
            'access_mode' => $accessMode,
            'join_request_url' => $withStoredUrl ? 'https://t.me/+shared' : null,
            'is_active' => true,
        ]);
        $destination->requirements()->create([
            'requirement_type' => 'product',
            'requirement_value' => (string) $product->id,
        ]);

        return [$bot, $account, $destination];
    }
}
