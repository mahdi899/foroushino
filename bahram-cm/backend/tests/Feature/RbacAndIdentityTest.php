<?php

namespace Tests\Feature;

use App\Actions\Identity\ApproveIdentityVerification;
use App\Actions\Identity\EnsureIdentityProfile;
use App\Actions\Identity\TryActivateSatMembership;
use App\Actions\Identity\VerifyMobileOwnership;
use App\Enums\AdminRoleName;
use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Enums\OwnershipVerificationResult;
use App\Enums\SatApplicationStatus;
use App\Enums\SatMembershipStatus;
use App\Models\AdminAuditLog;
use App\Models\IdentityVerificationRoute;
use App\Models\IdentityVerificationSubmission;
use App\Models\SatApplication;
use App\Models\SatMembership;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Support\NationalCode;
use App\Support\PermissionCatalog;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RbacAndIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_auth_me_returns_real_roles_and_permissions(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.is_super_admin', true)
            ->assertJsonPath('data.roles.0', 'super-admin')
            ->assertJsonFragment(['students.view_full_mobile']);
    }

    public function test_student_list_masks_mobile_and_support_cannot_reveal(): void
    {
        $support = $this->makeAdmin(AdminRoleName::Support);
        $student = User::factory()->create([
            'mobile' => '09121234567',
            'is_admin' => false,
            'name' => 'دانشجو تست',
        ]);

        Sanctum::actingAs($support);

        $this->getJson('/api/v1/students')
            ->assertOk()
            ->assertJsonMissing(['mobile' => '09121234567'])
            ->assertJsonFragment(['mobile_masked' => '0912***4567']);

        $this->postJson("/api/v1/students/{$student->id}/reveal-mobile")
            ->assertForbidden();
    }

    public function test_student_manager_can_reveal_mobile_and_creates_audit_log(): void
    {
        $manager = $this->makeAdmin(AdminRoleName::StudentManager);
        $student = User::factory()->create([
            'mobile' => '09121234567',
            'is_admin' => false,
        ]);

        Sanctum::actingAs($manager);

        $this->postJson("/api/v1/students/{$student->id}/reveal-mobile")
            ->assertOk()
            ->assertJsonPath('data.mobile', '09121234567');

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $manager->id,
            'action' => 'student.mobile_revealed',
            'subject_id' => $student->id,
        ]);
    }

    public function test_support_can_search_by_exact_mobile_but_response_is_masked(): void
    {
        $support = $this->makeAdmin(AdminRoleName::Support);
        User::factory()->create([
            'mobile' => '09129876543',
            'name' => 'محمد تست',
            'is_admin' => false,
        ]);

        Sanctum::actingAs($support);

        $this->getJson('/api/v1/students?search=09129876543')
            ->assertOk()
            ->assertJsonFragment(['name' => 'محمد تست'])
            ->assertJsonFragment(['mobile_masked' => '0912***6543'])
            ->assertJsonMissing(['mobile' => '09129876543']);
    }

    public function test_non_super_admin_cannot_export_students(): void
    {
        $manager = $this->makeAdmin(AdminRoleName::StudentManager);
        Sanctum::actingAs($manager);

        $this->getJson('/api/v1/panel/students/export')
            ->assertForbidden();
    }

    public function test_existing_user_remains_level_1_after_profile_ensure(): void
    {
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121111111']);
        $profile = app(EnsureIdentityProfile::class)($student);

        $this->assertSame(1, (int) $profile->verification_level);
        $this->assertSame(IdentityVerificationStatus::NotStarted, $profile->identity_status);
    }

    public function test_national_code_uniqueness_is_enforced_via_hash(): void
    {
        $code = '0010350829';
        $this->assertTrue(NationalCode::isValid($code));

        $a = User::factory()->create(['is_admin' => false, 'mobile' => '09120000001']);
        $b = User::factory()->create(['is_admin' => false, 'mobile' => '09120000002']);

        $profileA = app(EnsureIdentityProfile::class)($a);
        $profileA->update([
            'national_code_encrypted' => NationalCode::encrypt($code),
            'national_code_hash' => NationalCode::hash($code),
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        $profileB = app(EnsureIdentityProfile::class)($b);
        $profileB->update([
            'national_code_encrypted' => NationalCode::encrypt($code),
            'national_code_hash' => NationalCode::hash($code),
        ]);
    }

    public function test_approve_moves_user_to_level_2(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::KycOperator);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09123334455']);
        $submission = $this->makeSubmittedIdentity($student);

        app(ApproveIdentityVerification::class)($admin, $submission);

        $profile = $student->fresh()->identityProfile;
        $this->assertSame(IdentityVerificationStatus::Approved, $profile->identity_status);
        $this->assertSame(2, (int) $profile->verification_level);
    }

    public function test_sat_accepted_plus_level_1_does_not_activate_membership(): void
    {
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09124445566']);
        app(EnsureIdentityProfile::class)($student);

        SatApplication::query()->create([
            'user_id' => $student->id,
            'name' => 'تست',
            'mobile' => $student->mobile,
            'status' => SatApplicationStatus::Accepted,
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);

        $membership = app(TryActivateSatMembership::class)($student);
        $this->assertTrue(
            $membership === null || $membership->status !== SatMembershipStatus::Active
        );
    }

    public function test_sat_accepted_then_level_2_activates_membership_idempotently(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::KycOperator);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09125556677', 'name' => 'سات']);
        SatApplication::query()->create([
            'user_id' => $student->id,
            'name' => 'سات',
            'mobile' => $student->mobile,
            'status' => SatApplicationStatus::Accepted,
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);

        $submission = $this->makeSubmittedIdentity($student);
        app(ApproveIdentityVerification::class)($admin, $submission);

        $first = app(TryActivateSatMembership::class)($student);
        $second = app(TryActivateSatMembership::class)($student);

        $this->assertSame(SatMembershipStatus::Active, $first->status);
        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, SatMembership::query()->where('user_id', $student->id)->count());
    }

    public function test_level_1_cashback_payout_is_blocked(): void
    {
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09126667788']);
        app(EnsureIdentityProfile::class)($student);

        Sanctum::actingAs($student);

        $this->postJson('/api/v1/student/cashback-payouts', [
            'card_number' => '6037991234567890',
            'card_holder_name' => 'تست',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'identity_required');
    }

    public function test_mismatched_increments_attempts_and_locks_after_three(): void
    {
        $student = $this->makeLevel2Student('09127778899');
        $this->bindFakeOwnershipProvider(OwnershipVerificationResult::Mismatched);

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::MobileNationalCodeMatch->value],
            ['primary_provider' => 'fake-shahkar', 'fallback_provider' => null, 'is_active' => true],
        );

        $action = app(VerifyMobileOwnership::class);

        $action($student);
        $action($student);
        $result = $action($student);

        $profile = $result['profile'];
        $this->assertSame(3, (int) $profile->ownership_failed_attempts);
        $this->assertSame(MobileOwnershipStatus::Locked, $profile->mobile_ownership_status);
    }

    public function test_technical_error_does_not_increment_attempts(): void
    {
        $student = $this->makeLevel2Student('09128889900');
        $this->bindFakeOwnershipProvider(OwnershipVerificationResult::TechnicalError);

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::MobileNationalCodeMatch->value],
            ['primary_provider' => 'fake-shahkar', 'fallback_provider' => null, 'is_active' => true],
        );

        $result = app(VerifyMobileOwnership::class)($student);
        $this->assertSame(0, (int) $result['profile']->ownership_failed_attempts);
        $this->assertSame(OwnershipVerificationResult::TechnicalError, $result['result']);
    }

    public function test_matched_moves_user_to_level_3(): void
    {
        $student = $this->makeLevel2Student('09129990011');
        $this->bindFakeOwnershipProvider(OwnershipVerificationResult::Matched);

        IdentityVerificationRoute::query()->updateOrCreate(
            ['capability' => IdentityCapability::MobileNationalCodeMatch->value],
            ['primary_provider' => 'fake-shahkar', 'fallback_provider' => null, 'is_active' => true],
        );

        $result = app(VerifyMobileOwnership::class)($student);
        $this->assertSame(3, (int) $result['profile']->verification_level);
        $this->assertSame(MobileOwnershipStatus::Verified, $result['profile']->mobile_ownership_status);
    }

    public function test_override_without_reason_fails_and_with_reason_audits(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $student = $this->makeLevel2Student('09121112233');

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/students/{$student->id}/identity/override-level", [
            'level' => 1,
        ])->assertStatus(422);

        $this->postJson("/api/v1/students/{$student->id}/identity/override-level", [
            'level' => 1,
            'reason' => 'تست کاهش سطح',
        ])->assertOk();

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'identity.level_overridden',
        ]);
        $this->assertSame(1, (int) $student->fresh()->identityProfile->verification_level);
    }

    public function test_kyc_operator_can_view_queue_student_manager_cannot_view_documents_permission(): void
    {
        $operator = $this->makeAdmin(AdminRoleName::KycOperator);
        $manager = $this->makeAdmin(AdminRoleName::StudentManager);

        $this->assertTrue($operator->hasPermission('identity.view_sensitive_documents'));
        $this->assertFalse($manager->hasPermission('identity.view_sensitive_documents'));
        $this->assertFalse($manager->hasPermission('students.export'));
    }

    public function test_reserved_export_permission_not_assignable_to_non_super_admin_role_update(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::Admin);
        $role = \Spatie\Permission\Models\Role::findByName(AdminRoleName::Support->value);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/roles/{$role->id}", [
            'permissions' => ['students.view', 'students.export'],
        ])->assertForbidden();
    }

    public function test_super_admin_can_create_admin_user_with_role(): void
    {
        $super = $this->makeAdmin(AdminRoleName::SuperAdmin);
        Sanctum::actingAs($super);

        $this->postJson('/api/v1/roles/admins', [
            'name' => 'مالی جدید',
            'email' => 'new.finance@bahram.test',
            'password' => 'password123',
            'role' => AdminRoleName::Finance->value,
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'new.finance@bahram.test')
            ->assertJsonPath('data.roles.0', 'finance');

        $this->assertDatabaseHas('users', [
            'email' => 'new.finance@bahram.test',
            'is_admin' => true,
        ]);

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $super->id,
            'action' => 'admin.created',
        ]);
    }

    public function test_support_cannot_create_admin_user(): void
    {
        $support = $this->makeAdmin(AdminRoleName::Support);
        Sanctum::actingAs($support);

        $this->postJson('/api/v1/roles/admins', [
            'name' => 'مدیر تست',
            'email' => 'blocked@bahram.test',
            'password' => 'password123',
            'role' => AdminRoleName::Finance->value,
        ])->assertForbidden();
    }

    public function test_admin_cannot_create_super_admin_user(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::Admin);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/roles/admins', [
            'name' => 'مدیر کل جدید',
            'email' => 'blocked-super@bahram.test',
            'password' => 'password123',
            'role' => AdminRoleName::SuperAdmin->value,
        ])->assertUnprocessable()
            ->assertJsonPath('error.details.role.0', 'فقط مدیر کل می‌تواند مدیر کل جدید بسازد.');
    }

    private function makeAdmin(AdminRoleName $role): User
    {
        $user = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);
        $user->assignRole($role->value);

        return $user;
    }

    private function makeSubmittedIdentity(User $student, string $nationalCode = '0010350829'): IdentityVerificationSubmission
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
            'national_code_encrypted' => NationalCode::encrypt($nationalCode),
            'national_code_hash' => NationalCode::hash($nationalCode),
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'expected_video_text' => 'من صاحب این حساب کاربری هستم.',
            'submitted_at' => now(),
        ]);
    }

    private function makeLevel2Student(string $mobile): User
    {
        $student = User::factory()->create(['is_admin' => false, 'mobile' => $mobile]);
        $profile = app(EnsureIdentityProfile::class)($student);
        $code = '0010350829';
        $profile->update([
            'first_name' => 'علی',
            'last_name' => 'تست',
            'national_code_encrypted' => NationalCode::encrypt($code),
            'national_code_hash' => NationalCode::hash($code).'-'.Str::random(4),
            'identity_status' => IdentityVerificationStatus::Approved,
            'identity_verified_at' => now(),
            'verification_level' => 2,
        ]);

        // Fix unique hash (append was for parallel uniqueness in same DB) — use unique codes per user.
        $unique = str_pad((string) (1000000000 + $student->id), 10, '0', STR_PAD_LEFT);
        // Fallback: keep approved profile with unique hash even if checksum invalid for storage tests.
        $profile->update([
            'national_code_encrypted' => NationalCode::encrypt('0010350829'),
            'national_code_hash' => hash_hmac('sha256', '0010350829#'.$student->id, (string) config('app.key')),
        ]);

        return $student->fresh(['identityProfile']);
    }

    private function bindFakeOwnershipProvider(OwnershipVerificationResult $result): void
    {
        $fake = new class($result) implements MobileOwnershipVerificationProvider
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
                    provider_message: 'test',
                    provider_request_id: 'req-1',
                    duration_ms: 10,
                );
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
    }
}
