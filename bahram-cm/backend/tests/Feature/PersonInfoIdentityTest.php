<?php

namespace Tests\Feature;

use App\Actions\Identity\ApproveIdentityVerification;
use App\Actions\Identity\EnsureIdentityProfile;
use App\Actions\Identity\SubmitIdentityVerification;
use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Enums\OwnershipVerificationResult;
use App\Enums\SmsEventKey;
use App\Models\IdentityVerificationRoute;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\Contracts\PersonInfoVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\PersonInfoResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use App\Services\Identity\IdentityDailyLimitService;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Services\SmsService;
use App\Support\IdentityVerificationMessages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
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
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
                father_name: 'رضا',
                gender: 'male',
                alive: true,
            ),
            OwnershipVerificationResult::Matched,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110001']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('matched', $submission->registry_match_status);
        $this->assertSame('matched', $submission->mobile_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->fresh()->status);

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame(IdentityVerificationStatus::Submitted, $profile->identity_status);
        $this->assertSame(MobileOwnershipStatus::Verified, $profile->mobile_ownership_status);
        $this->assertSame(1, $profile->verification_level);
    }

    public function test_person_info_name_mismatch_stays_in_expert_queue(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'محمد',
                last_name: 'رستمی',
            ),
            OwnershipVerificationResult::Matched,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110002']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('mismatched', $submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->status);
        $this->assertSame('matched', $submission->mobile_match_status);
    }

    public function test_mobile_national_mismatch_rejects_immediately(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
            ),
            OwnershipVerificationResult::Mismatched,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110007']);

        try {
            $this->submitIdentity($student, [
                'first_name' => 'علی',
                'last_name' => 'تستی',
            ]);
            $this->fail('Expected ValidationException for mobile/national mismatch.');
        } catch (ValidationException $e) {
            $this->assertContains(
                IdentityVerificationMessages::MOBILE_NATIONAL_MISMATCH,
                $e->errors()['identity'] ?? [],
            );
        }

        $submission = IdentityVerificationSubmission::query()->where('user_id', $student->id)->latest('id')->first();
        $this->assertNotNull($submission);
        $this->assertSame('mismatched', $submission->mobile_match_status);
        $this->assertSame(IdentityVerificationStatus::Rejected, $submission->status);
        $this->assertNull($submission->registry_match_status);

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame(IdentityVerificationStatus::Rejected, $profile->identity_status);
        $this->assertSame(MobileOwnershipStatus::Mismatched, $profile->mobile_ownership_status);
    }

    public function test_three_mobile_mismatches_lock_until_end_of_day(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
            ),
            OwnershipVerificationResult::Mismatched,
        );

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
                // expected mismatch reject
            }
            UserIdentityProfile::query()->where('user_id', $student->id)->update([
                'identity_status' => IdentityVerificationStatus::Draft,
                'mobile_ownership_status' => MobileOwnershipStatus::NotStarted,
            ]);
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

    public function test_person_info_unavailable_stays_in_expert_queue(): void
    {
        $this->bindProviders(
            new PersonInfoResult(OwnershipVerificationResult::ProviderError),
            OwnershipVerificationResult::Matched,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110003']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('unavailable', $submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->status);
        $this->assertNotEmpty($submission->registry_message);

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame(IdentityVerificationStatus::Submitted, $profile->identity_status);
    }

    public function test_person_info_skipped_when_route_inactive(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
            ),
            OwnershipVerificationResult::Matched,
        );

        IdentityVerificationRoute::query()
            ->where('capability', IdentityCapability::PersonInfoInquiry->value)
            ->update(['is_active' => false]);

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110011']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('matched', $submission->mobile_match_status);
        $this->assertNull($submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->status);
        $this->assertStringContainsString('غیرفعال', (string) $submission->registry_message);
    }

    public function test_person_info_skipped_when_route_missing(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
            ),
            OwnershipVerificationResult::Matched,
        );

        IdentityVerificationRoute::query()
            ->where('capability', IdentityCapability::PersonInfoInquiry->value)
            ->delete();

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110012']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('matched', $submission->mobile_match_status);
        $this->assertNull($submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->status);
        $this->assertStringContainsString('تعریف نشده', (string) $submission->registry_message);
    }

    public function test_mobile_match_unavailable_stays_in_expert_queue(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
            ),
            OwnershipVerificationResult::ProviderError,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110008']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('unavailable', $submission->mobile_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->status);
        $this->assertNotEmpty($submission->mobile_match_message);
    }

    public function test_person_info_birth_date_mismatch_stays_in_expert_queue(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Mismatched,
                provider_message: 'اطلاعاتی برای این کد ملی یافت نشد.',
            ),
            OwnershipVerificationResult::Matched,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110010']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('matched', $submission->mobile_match_status);
        $this->assertSame('mismatched', $submission->registry_match_status);
        $this->assertNull($submission->registry_first_name);
        $this->assertSame('اطلاعاتی برای این کد ملی یافت نشد.', $submission->registry_message);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->status);

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame(IdentityVerificationStatus::Submitted, $profile->identity_status);
    }

    public function test_person_info_skipped_when_shahkar_unavailable(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
            ),
            OwnershipVerificationResult::ProviderError,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110009']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('unavailable', $submission->mobile_match_status);
        $this->assertNull($submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->status);
    }

    public function test_expert_approve_uses_registry_names_and_sends_sms(): void
    {
        $this->bindProviders(
            new PersonInfoResult(
                OwnershipVerificationResult::Matched,
                first_name: 'علی',
                last_name: 'تستی',
                father_name: 'رضا',
                gender: 'male',
                alive: true,
            ),
            OwnershipVerificationResult::Matched,
        );

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110006', 'name' => 'علی']);
        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
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
        $this->app->terminate();

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame('علی', $profile->first_name);
        $this->assertSame('تستی', $profile->last_name);
        $this->assertSame('رضا', $profile->father_name);
        $this->assertSame(IdentityVerificationStatus::Approved, $approved->status);
        // Identity approved + mobile ownership already verified at submit → level 3
        $this->assertSame(3, $profile->verification_level);
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

        $submission = app(SubmitIdentityVerification::class)($student, $data);
        $this->app->terminate();

        return $submission->fresh();
    }

    private function bindProviders(
        PersonInfoResult $personInfo,
        OwnershipVerificationResult $mobileResult,
    ): void {
        $personFake = new class($personInfo) implements PersonInfoVerificationProvider
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

        $mobileFake = new class($mobileResult) implements MobileOwnershipVerificationProvider
        {
            public function __construct(private OwnershipVerificationResult $result) {}

            public function slug(): string
            {
                return 'fake-shahkar';
            }

            public function capabilities(): array
            {
                return [IdentityCapability::MobileNationalCodeMatch];
            }

            public function isConfigured(): bool
            {
                return true;
            }

            public function testConnection(): ProviderConnectionResult
            {
                return ProviderConnectionResult::connected('ok');
            }

            public function verify(string $mobile, string $nationalCode): MobileOwnershipVerificationResult
            {
                return new MobileOwnershipVerificationResult(
                    normalized_result: $this->result,
                    provider_code: 'TEST',
                    provider_message: 'test mobile match',
                    provider_request_id: 'req-1',
                    duration_ms: 10,
                );
            }
        };

        $registry = \Mockery::mock(IdentityVerificationProviderRegistry::class);
        $registry->shouldReceive('resolveForCapability')
            ->andReturnUsing(function (IdentityCapability $capability, callable $verifyWith) use ($personFake, $mobileFake) {
                $provider = match ($capability) {
                    IdentityCapability::PersonInfoInquiry => $personFake,
                    IdentityCapability::MobileNationalCodeMatch => $mobileFake,
                    default => $personFake,
                };

                $route = IdentityVerificationRoute::query()
                    ->where('capability', $capability->value)
                    ->first();

                return [
                    'provider' => $provider,
                    'result' => $verifyWith($provider),
                    'used_fallback' => false,
                    'route' => $route,
                ];
            });

        $this->app->instance(IdentityVerificationProviderRegistry::class, $registry);

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::PersonInfoInquiry->value],
            ['primary_provider' => 'fake-person-info', 'fallback_provider' => null, 'is_active' => true],
        );
        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::MobileNationalCodeMatch->value],
            ['primary_provider' => 'fake-shahkar', 'fallback_provider' => null, 'is_active' => true],
        );
    }
}
