<?php

namespace Tests\Feature\Family;

use App\Models\Family;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FamilyManagementApiTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('family.families.manage', 'web');
        Permission::findOrCreate('family.families.view', 'web');

        $role = Role::findOrCreate('family_manager', 'web');
        $role->givePermissionTo(['family.families.manage', 'family.families.view']);

        $this->manager = User::factory()->create(['is_admin' => true]);
        $this->manager->assignRole($role);
    }

    public function test_manager_can_create_update_and_delete_empty_family(): void
    {
        $create = $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/family-manager/families', [
                'internal_name' => 'رویش',
                'profile_description' => 'خانواده تست',
            ]);

        $create->assertCreated()
            ->assertJsonPath('data.internal_name', 'رویش')
            ->assertJsonPath('data.profile.description', 'خانواده تست');

        $familyId = $create->json('data.id');

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/family-manager/families/{$familyId}", [
                'internal_name' => 'مسیر',
                'accepting_members' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.internal_name', 'مسیر')
            ->assertJsonPath('data.accepting_members', false);

        $this->actingAs($this->manager, 'sanctum')
            ->deleteJson("/api/v1/family-manager/families/{$familyId}")
            ->assertOk();

        $this->assertDatabaseMissing('families', ['id' => $familyId]);
    }

    public function test_cannot_delete_family_with_members(): void
    {
        $family = Family::query()->create([
            'internal_name' => 'سپهر',
            'member_count' => 3,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->deleteJson("/api/v1/family-manager/families/{$family->id}")
            ->assertStatus(422);
    }
}
