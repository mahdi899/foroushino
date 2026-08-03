<?php

namespace Tests\Unit\Telegram;

use App\Models\CourseAccess;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationMobileMerge;
use App\Modules\TelegramBot\Services\DestinationAccessPolicy;
use App\Modules\TelegramBot\Services\DestinationMobileMergeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DestinationMobileMergePolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_canonical_mobile_blocked_for_destinations_when_merge_approved(): void
    {
        [$bot, $canonicalUser, $canonicalAccount, $telegramAccount, $destination] = $this->seedMergeScenario();

        TelegramDestinationMobileMerge::query()->create([
            'canonical_mobile' => '09121111111',
            'telegram_mobile' => '09352222222',
            'canonical_user_id' => $canonicalUser->id,
            'telegram_account_id' => $telegramAccount->id,
            'status' => TelegramDestinationMobileMerge::STATUS_APPROVED,
            'approved_at' => now(),
        ]);

        $result = app(DestinationAccessPolicy::class)->evaluateForAccount($destination, $canonicalAccount);

        $this->assertFalse($result['allowed']);
        $this->assertStringContainsString('ادغام', $result['reason']);
    }

    public function test_telegram_mobile_uses_canonical_user_access_for_destinations(): void
    {
        [$bot, $canonicalUser, $canonicalAccount, $telegramAccount, $destination] = $this->seedMergeScenario();

        CourseAccess::query()->create([
            'user_id' => $canonicalUser->id,
            'product_id' => $destination->requirements()->first()->requirement_value,
            'status' => 'active',
            'mobile' => $canonicalUser->mobile,
        ]);

        TelegramDestinationMobileMerge::query()->create([
            'canonical_mobile' => '09121111111',
            'telegram_mobile' => '09352222222',
            'canonical_user_id' => $canonicalUser->id,
            'telegram_account_id' => $telegramAccount->id,
            'status' => TelegramDestinationMobileMerge::STATUS_APPROVED,
            'approved_at' => now(),
        ]);

        $result = app(DestinationAccessPolicy::class)->evaluateForAccount($destination, $telegramAccount);

        $this->assertTrue($result['allowed']);
    }

    public function test_merge_service_propose_and_revoke(): void
    {
        [$bot, $canonicalUser, $canonicalAccount, $telegramAccount] = array_slice($this->seedMergeScenario(), 0, 4);

        $merge = app(DestinationMobileMergeService::class)->propose(
            '09121111111',
            '09352222222',
            'test note',
        );

        $this->assertTrue($merge->isPending());

        $approved = app(DestinationMobileMergeService::class)->approve($merge);
        $this->assertTrue($approved->isApproved());

        $revoked = app(DestinationMobileMergeService::class)->revoke($approved);
        $this->assertSame(TelegramDestinationMobileMerge::STATUS_REVOKED, $revoked->status);
    }

    /**
     * @return array{0: TelegramBot, 1: User, 2: TelegramAccount, 3: TelegramAccount, 4: TelegramDestination}
     */
    private function seedMergeScenario(): array
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $canonicalUser = User::factory()->create(['mobile' => '09121111111']);
        $product = Product::query()->create([
            'title' => 'کمپین',
            'slug' => 'campaign-merge-test',
            'price' => 1000000,
            'is_active' => true,
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه تست',
            'chat_id' => '-100999',
            'is_active' => true,
        ]);
        $destination->requirements()->create([
            'requirement_type' => 'active_course_access',
            'requirement_value' => (string) $product->id,
        ]);

        $canonicalAccount = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 100001,
            'user_id' => $canonicalUser->id,
            'mobile' => '09121111111',
            'mobile_verified_at' => now(),
        ]);

        $telegramAccount = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 100002,
            'mobile' => '09352222222',
            'mobile_verified_at' => now(),
        ]);

        return [$bot, $canonicalUser, $canonicalAccount, $telegramAccount, $destination];
    }
}
