<?php

namespace Tests\Unit\Telegram;

use App\Models\CourseAccess;
use App\Models\Product;
use App\Models\User;
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
            'slug' => 'sat-course',
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
            'telegram_user_id' => 123456,
            'user_id' => $user->id,
            'mobile' => '09120000000',
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه سات',
            'chat_id' => '-100999',
            'access_mode' => 'per_user',
            'is_active' => true,
        ]);
        $destination->requirements()->create([
            'requirement_type' => 'product',
            'requirement_value' => (string) $product->id,
        ]);

        $service = app(DestinationInviteLinkService::class);

        $first = $service->resolveInviteUrl($bot, $destination, $account);
        $second = $service->resolveInviteUrl($bot, $destination, $account);

        $this->assertSame('https://t.me/+fake', $first);
        $this->assertSame($first, $second);
        $this->assertSame(1, TelegramDestinationInviteLink::query()->count());
    }

    public function test_shared_mode_uses_join_request_url(): void
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
            'title' => 'کمپین‌نویسی',
            'slug' => 'campaign-writing',
            'price' => 2000000,
            'is_active' => true,
        ]);
        CourseAccess::query()->create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'active',
        ]);

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 654321,
            'user_id' => $user->id,
            'mobile' => '09121111111',
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه کمپین',
            'chat_id' => '-100888',
            'access_mode' => 'join_request',
            'join_request_url' => 'https://t.me/+shared',
            'is_active' => true,
        ]);
        $destination->requirements()->create([
            'requirement_type' => 'product',
            'requirement_value' => (string) $product->id,
        ]);

        $url = app(DestinationInviteLinkService::class)->resolveInviteUrl($bot, $destination, $account);

        $this->assertSame('https://t.me/+shared', $url);
        $this->assertSame(0, TelegramDestinationInviteLink::query()->count());
    }
}
