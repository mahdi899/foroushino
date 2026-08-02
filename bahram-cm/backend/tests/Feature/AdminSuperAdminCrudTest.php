<?php

namespace Tests\Feature;

use App\Actions\Identity\EnsureIdentityProfile;
use App\Enums\AdminRoleName;
use App\Enums\IdentityVerificationStatus;
use App\Models\IdentityVerificationSubmission;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\TelegramHostAccountSync;
use App\Support\NationalCode;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class AdminSuperAdminCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $sync = Mockery::mock(TelegramHostAccountSync::class)->shouldIgnoreMissing();
        $this->app->instance(TelegramHostAccountSync::class, $sync);
    }

    public function test_support_cannot_reset_identity_or_delete_student_or_order(): void
    {
        $support = $this->makeAdmin(AdminRoleName::Support);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09121111111']);
        app(EnsureIdentityProfile::class)($student);
        $order = $this->makeOrder($student);

        Sanctum::actingAs($support, ['*']);

        $this->postJson("/api/v1/students/{$student->id}/identity/reset", ['reason' => 'test'])
            ->assertForbidden();

        $this->deleteJson("/api/v1/students/{$student->id}")
            ->assertForbidden();

        $this->deleteJson("/api/v1/orders/{$order->id}")
            ->assertForbidden();
    }

    public function test_kyc_operator_can_reset_identity(): void
    {
        $operator = $this->makeAdmin(AdminRoleName::KycOperator);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09126667788']);
        $profile = app(EnsureIdentityProfile::class)($student);
        $profile->update([
            'verification_level' => 2,
            'identity_status' => IdentityVerificationStatus::Approved,
        ]);

        IdentityVerificationSubmission::query()->create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $student->id,
            'identity_profile_id' => $profile->id,
            'version' => 1,
            'status' => IdentityVerificationStatus::Approved,
            'first_name' => 'رضا',
            'last_name' => 'تست',
            'national_code_encrypted' => NationalCode::encrypt('0010350829'),
            'national_code_hash' => NationalCode::hash('0010350829'),
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);

        Sanctum::actingAs($operator, ['*']);

        $this->postJson("/api/v1/students/{$student->id}/identity/reset", [
            'reason' => 'wrong national code submitted',
        ])->assertOk();
    }

    public function test_reset_identity_works_when_student_row_has_polluted_admin_flags(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $student = User::factory()->create([
            'is_admin' => true,
            'is_root_admin' => true,
            'mobile' => '09104085688',
        ]);
        $student->assignRole(AdminRoleName::SuperAdmin->value);
        $profile = app(EnsureIdentityProfile::class)($student);
        $profile->update([
            'verification_level' => 2,
            'identity_status' => IdentityVerificationStatus::Approved,
        ]);

        IdentityVerificationSubmission::query()->create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $student->id,
            'identity_profile_id' => $profile->id,
            'version' => 1,
            'status' => IdentityVerificationStatus::Approved,
            'first_name' => 'کاربر',
            'last_name' => 'تست',
            'national_code_encrypted' => NationalCode::encrypt('0010350829'),
            'national_code_hash' => NationalCode::hash('0010350829'),
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/v1/students/{$student->id}/identity/reset", [
            'reason' => 'cleanup polluted admin flags on student account',
        ])->assertOk();

        $this->assertSame(IdentityVerificationStatus::NotStarted, $profile->fresh()->identity_status);
    }

    public function test_reset_identity_still_blocks_real_staff_without_identity_trail(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $staff = $this->makeAdmin(AdminRoleName::Support);

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/v1/students/{$staff->id}/identity/reset", [
            'reason' => 'should not work',
        ])->assertNotFound();
    }

    public function test_super_admin_can_reset_identity_and_preserves_submissions(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09122222222']);
        $profile = app(EnsureIdentityProfile::class)($student);
        $profile->update([
            'verification_level' => 2,
            'identity_status' => IdentityVerificationStatus::Approved,
            'national_code_hash' => NationalCode::hash('0010350829'),
            'national_code_encrypted' => NationalCode::encrypt('0010350829'),
        ]);

        IdentityVerificationSubmission::query()->create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $student->id,
            'identity_profile_id' => $profile->id,
            'version' => 1,
            'status' => IdentityVerificationStatus::Approved,
            'first_name' => 'علی',
            'last_name' => 'تست',
            'national_code_encrypted' => NationalCode::encrypt('0010350829'),
            'national_code_hash' => NationalCode::hash('0010350829'),
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/v1/students/{$student->id}/identity/reset", [
            'reason' => 'duplicate national code cleanup',
        ])->assertOk();

        $profile->refresh();
        $this->assertSame(1, $profile->verification_level);
        $this->assertNull($profile->national_code_hash);
        $this->assertSame(IdentityVerificationStatus::NotStarted, $profile->identity_status);
        $this->assertSame(1, IdentityVerificationSubmission::query()->where('user_id', $student->id)->count());

        $this->assertDatabaseHas('identity_verification_overrides', [
            'user_id' => $student->id,
            'actor_id' => $admin->id,
            'previous_level' => 2,
            'new_level' => 1,
        ]);
    }

    public function test_super_admin_can_delete_cancelled_order(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09123333333']);
        $order = $this->makeOrder($student, 'cancelled', 'failed');

        Sanctum::actingAs($admin, ['*']);

        $this->deleteJson("/api/v1/orders/{$order->id}")
            ->assertOk();

        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
    }

    public function test_super_admin_can_force_delete_paid_order(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09124444444']);
        $order = $this->makeOrder($student, 'paid', 'paid');

        Sanctum::actingAs($admin, ['*']);

        $this->deleteJson("/api/v1/orders/{$order->id}")
            ->assertStatus(422);

        $this->deleteJson("/api/v1/orders/{$order->id}", ['force' => true])
            ->assertOk();

        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
    }

    public function test_super_admin_can_delete_student(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $student = User::factory()->create(['is_admin' => false, 'mobile' => '09125555555']);
        app(EnsureIdentityProfile::class)($student);
        $order = $this->makeOrder($student, 'paid', 'paid');
        $studentId = $student->id;
        $orderId = $order->id;

        Sanctum::actingAs($admin, ['*']);

        $this->deleteJson("/api/v1/students/{$studentId}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $studentId]);
        $this->assertDatabaseMissing('user_identity_profiles', ['user_id' => $studentId]);
        $this->assertDatabaseMissing('orders', ['id' => $orderId]);

        $this->assertDatabaseHas('student_recovery_archives', [
            'original_user_id' => $studentId,
            'mobile' => '09125555555',
        ]);

        $archive = \App\Models\StudentRecoveryArchive::query()->where('original_user_id', $studentId)->first();
        $this->assertNotNull($archive);
        $this->assertSame(1, $archive->snapshot['meta']['orders_count'] ?? null);
        $this->assertCount(1, $archive->snapshot['orders'] ?? []);
    }

    public function test_identity_history_lists_all_submissions(): void
    {
        $admin = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $student = User::factory()->create(['is_admin' => false]);
        $profile = app(EnsureIdentityProfile::class)($student);

        foreach ([1, 2] as $version) {
            IdentityVerificationSubmission::query()->create([
                'uuid' => (string) Str::uuid(),
                'user_id' => $student->id,
                'identity_profile_id' => $profile->id,
                'version' => $version,
                'status' => IdentityVerificationStatus::Rejected,
                'first_name' => 'علی',
                'last_name' => 'تست',
                'national_code_encrypted' => NationalCode::encrypt('0010350829'),
                'national_code_hash' => NationalCode::hash('0010350829').'-'.$version,
                'date_of_birth' => '1990-01-01',
                'gender' => 'male',
                'city' => 'تهران',
                'submitted_at' => now(),
            ]);
        }

        Sanctum::actingAs($admin, ['*']);

        $this->getJson("/api/v1/students/{$student->id}/identity/history")
            ->assertOk()
            ->assertJsonCount(2, 'data');
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

    private function makeOrder(User $student, string $status = 'cancelled', string $paymentStatus = 'failed'): Order
    {
        $product = Product::query()->create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 100_000,
            'is_active' => true,
        ]);

        return Order::query()->create([
            'user_id' => $student->id,
            'order_number' => 'BC-TEST-'.Str::upper(Str::random(6)),
            'product_id' => $product->id,
            'customer_name' => $student->name,
            'customer_phone' => $student->mobile,
            'amount' => 100_000,
            'final_amount' => 100_000,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'paid_at' => $status === 'paid' ? now() : null,
        ]);
    }
}
