<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\OtpService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStudentPanelAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_can_send_student_otp(): void
    {
        User::factory()->create([
            'mobile' => '09104085688',
            'is_admin' => true,
        ]);

        $this->mock(OtpService::class, function ($mock) {
            $mock->shouldReceive('send')->once();
        });

        $this->postJson('/api/v1/student/auth/send-otp', ['mobile' => '09104085688'])
            ->assertOk()
            ->assertJsonPath('data.mobile', '09104085688');
    }

    public function test_admin_can_verify_student_otp_and_get_student_token(): void
    {
        $admin = User::factory()->create([
            'mobile' => '09104085688',
            'is_admin' => true,
            'name' => 'مدیر',
        ]);

        $this->mock(OtpService::class, function ($mock) {
            $mock->shouldReceive('verify')->once();
        });

        $response = $this->postJson('/api/v1/student/auth/verify-otp', [
            'mobile' => '09104085688',
            'code' => '12345',
        ])->assertOk();

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertSame($admin->id, $response->json('data.user.id'));
    }

    public function test_student_scoped_token_cannot_access_admin_api(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $token = $admin->createToken('student-panel', ['student'])->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertForbidden();
    }

    public function test_admin_wildcard_token_can_access_admin_api(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($admin, ['*']);

        $this->getJson('/api/v1/auth/me')->assertOk();
    }
}
