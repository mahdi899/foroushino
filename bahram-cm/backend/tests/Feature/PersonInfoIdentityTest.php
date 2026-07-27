<?php

namespace Tests\Feature;

use App\Actions\Identity\ApproveIdentityVerification;
use App\Actions\Identity\EnsureIdentityProfile;
use App\Actions\Identity\SubmitIdentityVerification;
use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityVerificationRoute;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Identity\Contracts\PersonInfoVerificationProvider;
use App\Services\Identity\DTOs\PersonInfoResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Support\NationalCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class PersonInfoIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\IdentityProviderSeeder::class);
        Storage::fake('local');
    }

    public function test_person_info_match_auto_approves_submission_with_registry_names(): void
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
        $this->assertSame(IdentityVerificationStatus::Approved, $submission->fresh()->status);

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame(IdentityVerificationStatus::Approved, $profile->identity_status);
        $this->assertSame(2, $profile->verification_level);
    }

    public function test_person_info_mismatch_keeps_manual_queue_and_uses_registry_names_on_approval(): void
    {
        $this->bindPersonInfoProvider(new PersonInfoResult(
            OwnershipVerificationResult::Matched,
            first_name: 'محمد',
            last_name: 'رستمی',
        ));

        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121110002']);

        $submission = $this->submitIdentity($student, [
            'first_name' => 'علی',
            'last_name' => 'تستی',
        ]);

        $this->assertSame('mismatched', $submission->registry_match_status);
        $this->assertSame(IdentityVerificationStatus::Submitted, $submission->fresh()->status);

        $admin = User::factory()->create(['is_admin' => true]);
        $approved = app(ApproveIdentityVerification::class)($admin, $submission->fresh());

        $profile = UserIdentityProfile::query()->where('user_id', $student->id)->firstOrFail();
        $this->assertSame('محمد', $profile->first_name);
        $this->assertSame('رستمی', $profile->last_name);
        $this->assertSame(IdentityVerificationStatus::Approved, $approved->status);
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
