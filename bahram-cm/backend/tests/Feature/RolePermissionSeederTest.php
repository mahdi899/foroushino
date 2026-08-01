<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class RolePermissionSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_does_not_promote_all_admins_to_super_admin(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $support = $this->makeAdmin(AdminRoleName::Support);
        $finance = $this->makeAdmin(AdminRoleName::Finance);

        $this->seed(RolePermissionSeeder::class);

        $this->assertFalse($support->fresh()->isSuperAdmin());
        $this->assertFalse($finance->fresh()->isSuperAdmin());
        $this->assertTrue($support->fresh()->hasRole(AdminRoleName::Support->value));
        $this->assertTrue($finance->fresh()->hasRole(AdminRoleName::Finance->value));
    }

    public function test_assign_admin_role_only_changes_target_user(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $super = $this->makeAdmin(AdminRoleName::SuperAdmin);
        $support = $this->makeAdmin(AdminRoleName::Support);
        $finance = $this->makeAdmin(AdminRoleName::Finance);

        $this->actingAs($super, 'sanctum')
            ->patchJson("/api/v1/roles/admins/{$finance->id}", [
                'role' => AdminRoleName::StudentManager->value,
                'confirm' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.roles.0', AdminRoleName::StudentManager->value);

        $this->assertTrue($finance->fresh()->hasRole(AdminRoleName::StudentManager->value));
        $this->assertFalse($finance->fresh()->isSuperAdmin());
        $this->assertTrue($support->fresh()->hasRole(AdminRoleName::Support->value));
        $this->assertFalse($support->fresh()->isSuperAdmin());
    }

    private function makeAdmin(AdminRoleName $role): User
    {
        $user = User::factory()->create([
            'email' => Str::uuid().'@bahram.test',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }
}
