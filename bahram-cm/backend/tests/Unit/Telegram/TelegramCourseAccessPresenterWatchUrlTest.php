<?php

namespace Tests\Unit\Telegram;

use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramCourseAccessPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramCourseAccessPresenterWatchUrlTest extends TestCase
{
    use RefreshDatabase;

    public function test_watch_button_uses_viewer_access_and_phone_matched_license(): void
    {
        $sharedMobile = '09104085688';

        $viewer = User::factory()->create(['mobile' => $sharedMobile]);
        $other = User::factory()->create(['mobile' => '09121111111']);

        $product = Product::create([
            'title' => 'دوره کمپین‌نویسی',
            'slug' => 'campaign-bot-watch',
            'type' => 'normal',
            'price' => 1_000_000,
            'spotplayer_course_id' => 'spot-bot',
            'is_active' => true,
        ]);

        $viewerAccess = CourseAccess::create([
            'user_id' => $viewer->id,
            'product_id' => $product->id,
            'status' => 'active',
            'access_type' => 'lifetime',
            'source' => 'zarinpal',
            'activated_at' => now(),
        ]);

        $otherAccess = CourseAccess::create([
            'user_id' => $other->id,
            'product_id' => $product->id,
            'status' => 'active',
            'access_type' => 'lifetime',
            'source' => 'zarinpal',
            'activated_at' => now(),
        ]);

        $order = Order::create([
            'order_number' => 'BC-BOT',
            'user_id' => $other->id,
            'product_id' => $product->id,
            'customer_name' => 'خریدار',
            'customer_phone' => $sharedMobile,
            'amount' => 1_000_000,
            'discount_amount' => 0,
            'final_amount' => 1_000_000,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $license = SpotplayerLicense::create([
            'user_id' => $other->id,
            'product_id' => $product->id,
            'order_id' => $order->id,
            'course_access_id' => $otherAccess->id,
            'spotplayer_course_id' => 'spot-bot',
            'license_key' => 'telegram-shared-license',
            'status' => 'active',
        ]);

        $bot = TelegramBot::query()->create([
            'key' => 'test-bot',
            'display_name' => 'Test Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 700001,
            'user_id' => $viewer->id,
            'mobile' => $sharedMobile,
            'is_verified' => true,
        ]);

        $presented = app(TelegramCourseAccessPresenter::class)->present($bot, $account, $product);
        $keyboard = $presented['options']['reply_markup']['inline_keyboard'] ?? [];
        $watchButton = $keyboard[0][0] ?? null;

        $this->assertNotNull($watchButton);
        $this->assertStringContainsString(
            '/panel/courses/'.$viewerAccess->id.'/watch?license='.$license->id,
            (string) ($watchButton['url'] ?? ''),
        );
        $this->assertStringNotContainsString('/panel/courses/'.$otherAccess->id.'/watch', (string) ($watchButton['url'] ?? ''));
    }
}
