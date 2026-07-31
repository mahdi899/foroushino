<?php

namespace Tests\Feature;

use App\Actions\Identity\ApproveIdentityVerification;
use App\Actions\Identity\EnsureIdentityProfile;
use App\Enums\IdentityVerificationStatus;
use App\Events\IdentityLevel2Approved;
use App\Listeners\NotifyIdentityApprovedTelegramListener;
use App\Models\IdentityVerificationSubmission;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;
use App\Services\TelegramHostAccountSync;
use App\Services\TelegramInfrastructureService;
use App\Support\NationalCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class IdentityApprovedTelegramTest extends TestCase
{
    use RefreshDatabase;

    public function test_approve_dispatches_identity_event_after_response(): void
    {
        Event::fake([IdentityLevel2Approved::class]);

        $admin = User::factory()->create(['is_admin' => true]);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121231234']);
        $submission = $this->makeSubmittedIdentity($student);

        app(ApproveIdentityVerification::class)($admin, $submission);

        Event::assertNotDispatched(IdentityLevel2Approved::class);

        $this->app->terminate();

        Event::assertDispatched(
            IdentityLevel2Approved::class,
            fn (IdentityLevel2Approved $event) => $event->user->id === $student->id,
        );
    }

    public function test_identity_approved_listener_pushes_reference_channel_notification(): void
    {
        [$student, $bot, $channel, $account] = $this->seedReferenceChannelUser();

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $profile->forceFill([
            'verification_level' => 2,
            'identity_status' => IdentityVerificationStatus::Approved,
        ])->save();

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $student->id,
            'source' => 'admin',
        ]);

        $hostSync = Mockery::mock(TelegramHostAccountSync::class);
        $hostSync->shouldReceive('pushPaidOrderNotification')
            ->once()
            ->withArgs(function (TelegramAccount $acc, string $text) use ($account, $student) {
                return $acc->id === $account->id
                    && $acc->user_id === $student->id
                    && str_contains($text, 'هویت شما تأیید شد');
            })
            ->andReturn(true);
        $this->app->instance(TelegramHostAccountSync::class, $hostSync);

        $infra = Mockery::mock(TelegramInfrastructureService::class);
        $infra->shouldReceive('usesHostBridge')->andReturn(true);
        $this->app->instance(TelegramInfrastructureService::class, $infra);

        app(NotifyIdentityApprovedTelegramListener::class)->handle(new IdentityLevel2Approved($student));
    }

    private function makeSubmittedIdentity(User $student): IdentityVerificationSubmission
    {
        $profile = app(EnsureIdentityProfile::class)($student);

        return IdentityVerificationSubmission::query()->create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $student->id,
            'identity_profile_id' => $profile->id,
            'version' => 1,
            'status' => IdentityVerificationStatus::Submitted,
            'first_name' => 'علی',
            'last_name' => 'تستی',
            'national_code_encrypted' => NationalCode::encrypt('0010350829'),
            'national_code_hash' => NationalCode::hash('0010350829'),
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'expected_video_text' => 'من صاحب این حساب کاربری هستم.',
            'submitted_at' => now(),
        ]);
    }

    /**
     * @return array{0: User, 1: TelegramBot, 2: ReferenceChannel, 3: TelegramAccount}
     */
    private function seedReferenceChannelUser(): array
    {
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09129876543']);
        app(EnsureIdentityProfile::class)($student);

        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $product = Product::create([
            'title' => 'کانال مرجع',
            'slug' => 'reference-telegram-'.uniqid(),
            'type' => Product::TYPE_REFERENCE_CHANNEL,
            'price' => 1000,
            'is_active' => true,
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه مرجع',
            'chat_id' => '-100'.random_int(1000, 9999),
            'is_active' => true,
        ]);

        $channel = ReferenceChannel::create([
            'title' => 'کانال مرجع',
            'slug' => 'kanal-mrgf',
            'status' => 'published',
            'show_in_telegram' => true,
            'price' => 1000,
            'product_id' => $product->id,
            'telegram_destination_id' => $destination->id,
        ]);

        TelegramDestinationRequirement::query()->create([
            'telegram_destination_id' => $destination->id,
            'requirement_type' => 'product',
            'requirement_value' => (string) $product->id,
            'group_key' => 'default',
            'operator' => 'all',
        ]);

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => random_int(100000, 999999),
            'user_id' => $student->id,
            'mobile' => $student->mobile,
            'mobile_verified_at' => now(),
        ]);

        return [$student, $bot, $channel, $account];
    }
}
