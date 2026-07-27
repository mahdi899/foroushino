<?php

namespace Tests\Feature;

use App\Actions\Identity\ApproveIdentityVerification;
use App\Actions\Identity\EnsureIdentityProfile;
use App\Actions\Identity\SubmitIdentityVerification;
use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\OwnershipVerificationResult;
use App\Enums\SmsEventKey;
use App\Jobs\PushTelegramHostSyncJob;
use App\Models\IdentityVerificationRoute;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\Identity\Contracts\PersonInfoVerificationProvider;
use App\Services\Identity\DTOs\PersonInfoResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use App\Services\Identity\IdentityDailyLimitService;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Services\SmsService;
use App\Support\IdentityVerificationMessages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PersonInfoIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\IdentityProviderSeeder::class);
        Storage::fake('local');
        Cache::flush();
    }

    public function test_person_info_match_stays_in_expert_queue_without_auto_approve(): void
    {
        $this->bindPersonInfoProvider(new PersonInfoResult(
            OwnershipVerificationResult::Matched,
            first_name: 'علی',
            last_name: 'تستی',
            father_name: 'رضا',
            gender: 'male',
            alive: true,
        ));

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110001']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('matched', $submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->fresh()->status);

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame(IdentityVerificationStatus::Submitted, $profile->identity_status);
        $this->assertSame(1, $profile->verification_level);
    }

    public function test_person_info_mismatch_rejects_with_persian_message_and_needs_correction(): void
    {
        $this->bindPersonInfoProvider(new PersonInfoResult(
            OwnershipVerificationResult::Matched,
            first_name: 'محمد',
            last_name: 'رستمی',
        ));

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110002']);

        try {
            $this->submitIdentity($student, [
                'first_name' => 'علی',
                'last_name' => 'تستی',
            ]);
            $this->fail('Expected ValidationException for identity mismatch.');
        } catch (ValidationException $e) {
            $this->assertContains(
                IdentityVerificationMessages::IDENTITY_MISMATCH,
                $e->errors()['identity'] ?? [],
            );
        }

        $submission = IdentityVerificationSubmission::query()->where('user_id', $student->id)->latest('id')->first();
        $this->assertNotNull($submission);
        $this->assertSame('mismatched', $submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::NeedsCorrection, $submission->status);
    }

    public function test_three_mismatches_lock_until_end_of_day(): void
    {
        $this->bindPersonInfoProvider(new PersonInfoResult(
            OwnershipVerificationResult::Matched,
            first_name: 'محمد',
            last_name: 'رستمی',
        ));

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110004']);
        $limits = app(IdentityDailyLimitService::class);

        for ($i = 0; $i < 2; $i++) {
            Cache::forget('identity-submit-cooldown:'.$student->id);
            try {
                $this->submitIdentity($student, [
                    'first_name' => 'علی',
                    'last_name' => 'تستی',
                ]);
            } catch (ValidationException) {
                // expected mismatch
            }
            UserIdentityProfile::query()->where('user_id', $student->id)->update([
                'identity_status' => IdentityVerificationStatus::Draft,
            ]);
            IdentityVerificationSubmission::query()
                ->where('user_id', $student->id)
                ->update(['status' => IdentityVerificationStatus::NeedsCorrection]);
        }

        Cache::forget('identity-submit-cooldown:'.$student->id);
        try {
            $this->submitIdentity($student, [
                'first_name' => 'علی',
                'last_name' => 'تستی',
            ]);
            $this->fail('Expected lock on third mismatch.');
        } catch (ValidationException $e) {
            $this->assertContains(
                IdentityVerificationMessages::IDENTITY_MISMATCH_LOCKED,
                $e->errors()['identity'] ?? [],
            );
        }

        $this->assertTrue($limits->isMismatchLocked($student));

        Cache::forget('identity-submit-cooldown:'.$student->id);
        $this->expectException(ValidationException::class);
        $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);
    }

    public function test_third_complete_submit_in_day_is_blocked(): void
    {
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110005']);
        app(EnsureIdentityProfile::class)($student);
        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();

        foreach ([1, 2] as $version) {
            IdentityVerificationSubmission::query()->create([
                'user_id' => $student->id,
                'identity_profile_id' => $profile->id,
                'version' => $version,
                'status' => IdentityVerificationStatus::Submitted,
                'first_name' => 'علی',
                'last_name' => 'تستی',
                'national_code_encrypted' => 'x',
                'national_code_hash' => 'hash-'.$version,
                'date_of_birth' => '1990-01-01',
                'gender' => 'male',
                'city' => 'تهران',
                'submitted_at' => now(),
            ]);
        }

        $this->expectException(ValidationException::class);
        app(IdentityDailyLimitService::class)->assertCanSubmit($student);
    }

    public function test_person_info_unavailable_falls_back_to_manual_review(): void
    {
        $this->bindPersonInfoProvider(new PersonInfoResult(OwnershipVerificationResult::ProviderError));

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110003']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('unavailable', $submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->fresh()->status);
    }

    public function test_expert_approve_uses_registry_names_sends_sms_and_queues_host_sync(): void
    {
        Queue::fake();

        $this->bindPersonInfoProvider(new PersonInfoResult(
            OwnershipVerificationResult::Matched,
            first_name: 'علی',
            last_name: 'تستی',
            father_name: 'رضا',
            gender: 'male',
            alive: true,
        ));

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110006', 'name' => 'علی']);
        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);
        TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 424242,
            'user_id' => $student->id,
            'mobile' => $student->mobile,
        ]);

        $sms = \Mockery::mock(SmsService::class);
        $sms->shouldReceive('sendEvent')
            ->once()
            ->withArgs(function (SmsEventKey $key, string $mobile) use ($student) {
                return $key === SmsEventKey::IdentityVerificationApproved
                    && $mobile === $student->mobile;
            })
            ->andReturn(true);
        $this->app->instance(SmsService::class, $sms);

        $admin = User::factory()->create(['is_admin' => true]);
        $approved = app(ApproveIdentityVerification::class)($admin, $submission->fresh());

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame('علی', $profile->first_name);
        $this->assertSame('تستی', $profile->last_name);
        $this->assertSame(IdentityVerificationStatus::Approved, $approved->status);
        $this->assertSame(2, $profile->verification_level);

        Queue::assertPushed(PushTelegramHostSyncJob::class);
    }

    /**
     * @param  array{first_name: string, last_name: string}  $names
     */
    private function submitIdentity(User $student, array $names): IdentityVerificationSubmission
    {
        app(EnsureIdentityProfile::class)($student);

        $data = array_merge($names, [
            'national_code' => '0010350829',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'national_card' => UploadedFile::fake()->image('card.jpg'),
            'selfie_video' => UploadedFile::fake()->create('selfie.mp4', 500, 'video/mp4'),
        ]);

        return app(SubmitIdentityVerification::class)($student, $data);
    }

    private function bindPersonInfoProvider(PersonInfoResult $result): void
    {
        $fake = new class($result) implements PersonInfoVerificationProvider
        {
            public function __construct(private PersonInfoResult $result) {}

            public function slug(): string
            {
                return 'fake-person-info';
            }

            public function capabilities(): array
            {
                return [IdentityCapability::PersonInfoInquiry];
            }

            public function isConfigured(): bool
            {
                return true;
            }

            public function testConnection(): ProviderConnectionResult
            {
                return ProviderConnectionResult::connected('ok');
            }

            public function lookup(string $nationalCode, string $birthDate): PersonInfoResult
            {
                return $this->result;
            }
        };

        $registry = \Mockery::mock(IdentityVerificationProviderRegistry::class);
        $registry->shouldReceive('resolveForCapability')
            ->andReturnUsing(function (IdentityCapability $capability, callable $verifyWith) use ($fake) {
                $route = IdentityVerificationRoute::query()
                    ->where('capability', $capability->value)
                    ->first();

                return [
                    'provider' => $fake,
                    'result' => $verifyWith($fake),
                    'used_fallback' => false,
                    'route' => $route,
                ];
            });

        $this->app->instance(IdentityVerificationProviderRegistry::class, $registry);

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::PersonInfoInquiry->value],
            ['primary_provider' => 'fake-person-info', 'fallback_provider' => null, 'is_active' => true],
        );
    }
}
