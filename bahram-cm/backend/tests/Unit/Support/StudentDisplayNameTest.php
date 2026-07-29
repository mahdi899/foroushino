<?php

namespace Tests\Unit\Support;

use App\Enums\IdentityVerificationStatus;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Support\StudentDisplayName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentDisplayNameTest extends TestCase
{
    use RefreshDatabase;

    public function test_uses_panel_display_name_for_normal_users(): void
    {
        $user = User::factory()->create(['name' => 'نام نمایشی جدید']);

        $this->assertSame('نام نمایشی جدید', StudentDisplayName::fromUser($user));
    }

    public function test_uses_verified_identity_name_when_level_two_or_higher(): void
    {
        $user = User::factory()->create(['name' => 'نام قدیمی ربات']);
        UserIdentityProfile::query()->create([
            'user_id' => $user->id,
            'first_name' => 'علی',
            'last_name' => 'احمدی',
            'identity_status' => IdentityVerificationStatus::Approved,
            'verification_level' => 2,
        ]);

        $this->assertSame('علی احمدی', StudentDisplayName::fromUser($user->fresh(['identityProfile'])));
    }

    public function test_telegram_account_prefers_linked_user_name_over_registration_name(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $user = User::factory()->create(['name' => 'نام پنل']);
        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 12345,
            'display_name' => 'یبذ قدرتی',
            'mobile' => '09120000000',
            'user_id' => $user->id,
            'mobile_verified_at' => now(),
        ]);

        $this->assertSame('نام پنل', StudentDisplayName::forTelegramAccount($account));
    }
}
