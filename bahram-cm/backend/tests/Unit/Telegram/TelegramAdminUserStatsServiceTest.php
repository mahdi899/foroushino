<?php

namespace Tests\Unit\Telegram;

use App\Models\Order;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramAdminUserStatsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramAdminUserStatsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_text_includes_phone_and_referral_stats(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $user = User::query()->create([
            'name' => 'امین شکری',
            'mobile' => '09399843394',
            'password' => bcrypt('secret'),
        ]);

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 97343715,
            'telegram_username' => 'PVamin',
            'display_name' => 'امین شکری',
            'mobile' => '09399843394',
            'user_id' => $user->id,
            'mobile_verified_at' => now(),
        ]);

        Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'T-1',
            'product_id' => null,
            'customer_name' => 'امین',
            'customer_phone' => '09399843394',
            'amount' => 1000,
            'final_amount' => 1000,
            'status' => 'paid',
            'payment_status' => 'paid',
        ]);

        $text = app(TelegramAdminUserStatsService::class)->formatProfileText($account);

        $this->assertStringContainsString('شناسه کاربری: 97343715', $text);
        $this->assertStringContainsString('امین شکری', $text);
        $this->assertStringContainsString('+989399843394', $text);
        $this->assertStringContainsString('🏦 تراکنش های موفق: 1', $text);
        $this->assertStringContainsString('تعداد زیرمجموعه', $text);
    }
}
