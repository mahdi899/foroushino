<?php

namespace Tests\Feature\Family;

use App\Models\Family;
use App\Models\LandingPage;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FamilyManagerLandingLeadsTest extends TestCase
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

    public function test_manager_can_list_unassigned_landing_leads(): void
    {
        $page = $this->makeLandingPage('summer', 'کمپین تابستان');

        Lead::create([
            'landing_page_id' => $page->id,
            'name' => 'سارا',
            'phone' => '09121110001',
            'source' => 'web_landing',
        ]);

        Lead::create([
            'landing_page_id' => $page->id,
            'name' => 'محمد',
            'phone' => '09121110002',
            'source' => 'web_landing',
            'status' => 'converted',
        ]);

        // Non-landing lead must not appear.
        Lead::create([
            'name' => 'تماس مستقیم',
            'phone' => '09121110003',
            'source' => 'web_contact',
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/family-manager/landing-leads?unassigned=1');

        $response->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.name', 'محمد')
            ->assertJsonPath('data.1.name', 'سارا')
            ->assertJsonPath('data.1.landing_page.title', 'کمپین تابستان')
            ->assertJsonPath('data.1.is_assigned', false);
    }

    public function test_manager_can_assign_landing_lead_to_family(): void
    {
        $page = $this->makeLandingPage('winter', 'کمپین زمستان');
        $lead = Lead::create([
            'landing_page_id' => $page->id,
            'name' => 'رضا',
            'phone' => '09123334444',
            'source' => 'web_landing',
        ]);

        $family = Family::query()->create([
            'internal_name' => 'هدف لندینگ',
            'lifecycle' => 'active',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/family-manager/landing-leads/{$lead->id}/assign", [
                'family_id' => $family->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.lead.is_assigned', true)
            ->assertJsonPath('data.lead.family.internal_name', 'هدف لندینگ')
            ->assertJsonPath('data.membership.family_id', $family->id);

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'family_id' => $family->id,
            'status' => 'converted',
        ]);

        $this->assertDatabaseHas('family_memberships', [
            'family_id' => $family->id,
        ]);

        $this->assertDatabaseHas('users', [
            'mobile' => '09123334444',
            'name' => 'رضا',
        ]);

        $this->assertSame(1, $family->fresh()->member_count);
    }

    public function test_cannot_assign_already_assigned_lead(): void
    {
        $page = $this->makeLandingPage('spring', 'کمپین بهار');
        $family = Family::query()->create([
            'internal_name' => 'قبلی',
            'lifecycle' => 'active',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $lead = Lead::create([
            'landing_page_id' => $page->id,
            'name' => 'نرگس',
            'phone' => '09125556666',
            'source' => 'web_landing',
            'family_id' => $family->id,
            'assigned_at' => now(),
            'status' => 'converted',
        ]);

        $other = Family::query()->create([
            'internal_name' => 'دیگر',
            'lifecycle' => 'active',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/family-manager/landing-leads/{$lead->id}/assign", [
                'family_id' => $other->id,
            ])
            ->assertStatus(422);
    }

    private function makeLandingPage(string $slug, string $title): LandingPage
    {
        return LandingPage::query()->create([
            'slug' => $slug,
            'title' => $title,
            'is_published' => true,
            'published_at' => now(),
            'form_fields' => ['message' => false, 'email' => false],
        ]);
    }
}
