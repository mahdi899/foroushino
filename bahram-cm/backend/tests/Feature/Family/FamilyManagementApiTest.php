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

    public function test_manager_can_list_add_and_remove_family_members_with_full_mobile(): void
    {
        $family = Family::query()->create([
            'internal_name' => 'آرامش',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $user = User::factory()->create([
            'name' => 'علی تست',
            'mobile' => '09121234567',
            'is_admin' => false,
        ]);

        $add = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/family-manager/families/{$family->id}/members", [
                'mobile' => '09121234567',
            ]);
        $add->assertCreated()
            ->assertJsonPath('data.mobile', '09121234567')
            ->assertJsonPath('data.name', 'علی تست');

        $membershipId = $add->json('data.id');
        $this->assertDatabaseHas('family_memberships', [
            'id' => $membershipId,
            'user_id' => $user->id,
            'family_id' => $family->id,
        ]);
        $this->assertSame(1, $family->fresh()->member_count);

        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/v1/family-manager/families/{$family->id}/members")
            ->assertOk()
            ->assertJsonPath('data.0.mobile', '09121234567');

        $this->actingAs($this->manager, 'sanctum')
            ->deleteJson("/api/v1/family-manager/families/{$family->id}/members/{$membershipId}")
            ->assertOk();

        $this->assertDatabaseMissing('family_memberships', ['id' => $membershipId]);
        $this->assertSame(0, $family->fresh()->member_count);
    }

    public function test_family_members_endpoint_returns_only_requested_family(): void
    {
        $familyA = Family::query()->create([
            'internal_name' => 'فیلتر الف',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $familyB = Family::query()->create([
            'internal_name' => 'فیلتر ب',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $userA = User::factory()->create(['mobile' => '09121111111']);
        $userB = User::factory()->create(['mobile' => '09122222222']);

        \App\Models\FamilyMembership::query()->create([
            'user_id' => $userA->id,
            'family_id' => $familyA->id,
            'joined_at' => now(),
        ]);
        \App\Models\FamilyMembership::query()->create([
            'user_id' => $userB->id,
            'family_id' => $familyB->id,
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/v1/family-manager/families/{$familyA->id}/members");

        $response->assertOk();
        $mobiles = collect($response->json('data'))->pluck('mobile')->all();
        $this->assertSame(['09121111111'], $mobiles);
    }

    public function test_manager_can_create_user_when_adding_unknown_mobile_with_name(): void
    {
        $family = Family::query()->create([
            'internal_name' => 'نو',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/family-manager/families/{$family->id}/members", [
                'mobile' => '09129876543',
                'name' => 'کاربر جدید',
            ])
            ->assertCreated()
            ->assertJsonPath('data.mobile', '09129876543')
            ->assertJsonPath('data.name', 'کاربر جدید');

        $this->assertDatabaseHas('users', [
            'mobile' => '09129876543',
            'name' => 'کاربر جدید',
        ]);
    }
}
