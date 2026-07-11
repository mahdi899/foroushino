<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Enums\UserStatus;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlockedStudentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_blocked_student_cannot_send_otp(): void
    {
        User::create([
            'name' => 'مسدود',
            'mobile' => '09123334455',
            'status' => UserStatus::Blocked,
            'is_admin' => false,
        ]);

        $this->postJson('/api/v1/student/auth/send-otp', ['mobile' => '09123334455'])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'account_blocked');
    }

    public function test_blocked_student_cannot_verify_otp(): void
    {
        $user = User::create([
            'name' => 'مسدود',
            'mobile' => '09124445566',
            'status' => UserStatus::Blocked,
            'is_admin' => false,
        ]);

        $this->mock(\App\Services\OtpService::class, function ($mock) {
            $mock->shouldReceive('verify')->once();
        });

        $this->postJson('/api/v1/student/auth/verify-otp', [
            'mobile' => '09124445566',
            'code' => '12345',
        ])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'account_blocked');

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_blocked_student_cannot_access_panel_api(): void
    {
        $user = User::create([
            'name' => 'مسدود',
            'mobile' => '09125556677',
            'status' => UserStatus::Blocked,
            'is_admin' => false,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/student/me')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'account_blocked');
    }

    public function test_admin_blocking_revokes_tokens(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::StudentManager->value);
        $student = User::create([
            'name' => 'دانشجو',
            'mobile' => '09126667788',
            'status' => UserStatus::Active,
            'is_admin' => false,
        ]);

        $student->createToken('student-panel', ['student']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/students/{$student->id}", ['status' => 'blocked'])
            ->assertOk();

        $this->assertSame(0, $student->fresh()->tokens()->count());
        $this->assertSame(UserStatus::Blocked, $student->fresh()->status);
    }
}
