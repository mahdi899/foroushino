<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FamilyManagerAdminsApiTest extends TestCase
{
    use RefreshDatabase;

    private User $root;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate(AdminRoleName::FamilyManager->value, 'web');
        Role::findOrCreate(AdminRoleName::SuperAdmin->value, 'web');

        $this->root = User::factory()->create([
            'is_admin' => true,
            'is_root_admin' => true,
            'email' => 'root@example.com',
        ]);
        $this->root->assignRole(AdminRoleName::SuperAdmin->value);
    }

    public function test_root_can_create_list_suspend_reset_and_delete_family_manager(): void
    {
        $create = $this->actingAs($this->root, 'sanctum')
            ->postJson('/api/v1/family-manager/admins', [
                'name' => 'علی مدیر',
                'email' => 'family-admin@example.com',
                'mobile' => '09121234567',
                'password' => 'SecretPass1',
            ]);

        $create->assertCreated()
            ->assertJsonPath('data.name', 'علی مدیر')
            ->assertJsonPath('data.email', 'family-admin@example.com');

        $adminId = $create->json('data.id');

        $this->actingAs($this->root, 'sanctum')
            ->getJson('/api/v1/family-manager/admins')
            ->assertOk()
            ->assertJsonFragment(['email' => 'family-admin@example.com']);

        $this->actingAs($this->root, 'sanctum')
            ->postJson("/api/v1/family-manager/admins/{$adminId}/status", [
                'status' => UserStatus::Suspended->value,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::Suspended->value);

        $this->actingAs($this->root, 'sanctum')
            ->postJson("/api/v1/family-manager/admins/{$adminId}/reset-password", [
                'password' => 'NewSecret9',
            ])
            ->assertOk();

        $admin = User::query()->findOrFail($adminId);
        $this->assertTrue(Hash::check('NewSecret9', $admin->password));

        $this->actingAs($this->root, 'sanctum')
            ->postJson("/api/v1/family-manager/admins/{$adminId}/status", [
                'status' => UserStatus::Active->value,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::Active->value);

        $this->actingAs($this->root, 'sanctum')
            ->deleteJson("/api/v1/family-manager/admins/{$adminId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $adminId]);
    }

    public function test_family_manager_cannot_manage_admins(): void
    {
        $manager = User::factory()->create(['is_admin' => true]);
        $manager->assignRole(AdminRoleName::FamilyManager->value);

        $this->actingAs($manager, 'sanctum')
            ->getJson('/api/v1/family-manager/admins')
            ->assertForbidden();
    }
}
