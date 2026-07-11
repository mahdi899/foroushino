<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserMassAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_accepts_is_admin_in_mass_assignment(): void
    {
        $admin = User::query()->create([
            'name' => 'ادمین تست',
            'email' => 'admin-mass@bahram.local',
            'mobile' => '09129887766',
            'password' => 'password',
            'is_admin' => true,
        ]);

        $this->assertTrue($admin->fresh()->is_admin);
    }

    public function test_create_accepts_mobile_verified_at_in_mass_assignment(): void
    {
        $verifiedAt = now()->startOfSecond();

        $user = User::query()->create([
            'name' => 'دانشجو تست',
            'mobile' => '09129776655',
            'password' => 'password',
            'is_admin' => false,
            'mobile_verified_at' => $verifiedAt,
        ]);

        $fresh = $user->fresh();
        $this->assertFalse($fresh->is_admin);
        $this->assertNotNull($fresh->mobile_verified_at);
        $this->assertSame($verifiedAt->toDateTimeString(), $fresh->mobile_verified_at->toDateTimeString());
    }
}
