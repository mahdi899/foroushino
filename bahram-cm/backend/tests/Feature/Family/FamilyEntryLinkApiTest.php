<?php

namespace Tests\Feature\Family;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FamilyEntryLinkApiTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('family.entry_links.manage', 'web');

        $role = Role::findOrCreate('family_manager', 'web');
        $role->givePermissionTo('family.entry_links.manage');

        $this->manager = User::factory()->create(['is_admin' => true]);
        $this->manager->assignRole($role);
    }

    public function test_manager_can_create_entry_link_with_trackable_url(): void
    {
        $family = \App\Models\Family::query()->create([
            'internal_name' => 'سپهر',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/family-manager/entry-links', [
                'name' => 'ریل 482 — ترس از شروع',
                'source' => 'instagram_reel',
                'family_id' => $family->id,
                'campaign' => 'reel-482',
                'topic' => 'ترس از شروع',
                'external_reference' => 'reel-482',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'ریل 482 — ترس از شروع')
            ->assertJsonPath('data.source', 'instagram_reel')
            ->assertJsonPath('data.family_id', $family->id);

        $url = $response->json('data.url');
        $this->assertStringContainsString('/family?', $url);
        $this->assertStringContainsString('entry_event=', $url);
        $this->assertStringContainsString('family_id='.$family->id, $url);
        $this->assertStringContainsString('src=instagram_reel', $url);

        $this->assertDatabaseHas('family_entry_links', [
            'name' => 'ریل 482 — ترس از شروع',
            'source' => 'instagram_reel',
            'family_id' => $family->id,
        ]);

        $family->refresh();
        $this->assertNotNull($family->entry_event_id);
    }

    public function test_entry_link_routes_user_to_target_family(): void
    {
        $family = \App\Models\Family::query()->create([
            'internal_name' => 'هدف ریلز',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $other = \App\Models\Family::query()->create([
            'internal_name' => 'دیگر',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $user = User::factory()->create();
        $context = \App\Services\Family\EntryContext::fromArray([
            'source' => 'instagram_reel',
            'family_id' => $family->id,
        ]);

        $membership = app(\App\Services\Family\FamilyAssignmentService::class)->assign($user, $context);

        $this->assertSame($family->id, $membership->family_id);
        $this->assertNotSame($other->id, $membership->family_id);
    }

    public function test_entry_event_resolves_to_link_family_without_family_id_param(): void
    {
        $family = \App\Models\Family::query()->create([
            'internal_name' => 'از رویداد ورود',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $other = \App\Models\Family::query()->create([
            'internal_name' => 'دیگر',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $link = app(\App\Services\Family\FamilyEntryLinkService::class)->create([
            'name' => 'لینک تست',
            'source' => 'instagram_reel',
            'family_id' => $family->id,
            'campaign' => 'test-campaign',
        ]);

        $user = User::factory()->create();
        $context = \App\Services\Family\EntryContext::fromArray([
            'source' => 'instagram_reel',
            'entry_event' => (string) $link->entry_event_id,
        ]);

        $this->assertSame($family->id, $context->familyId);

        $membership = app(\App\Services\Family\FamilyAssignmentService::class)->assign($user, $context);

        $this->assertSame($family->id, $membership->family_id);
        $this->assertNotSame($other->id, $membership->family_id);
    }

    public function test_manager_can_update_entry_link(): void
    {
        $family = \App\Models\Family::query()->create([
            'internal_name' => 'اولیه',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $otherFamily = \App\Models\Family::query()->create([
            'internal_name' => 'جدید',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $create = $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/family-manager/entry-links', [
                'name' => 'لینک اولیه',
                'source' => 'instagram_reel',
                'family_id' => $family->id,
                'campaign' => 'old-campaign',
            ]);

        $linkId = (int) $create->json('data.id');

        $response = $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/family-manager/entry-links/{$linkId}", [
                'name' => 'لینک ویرایش‌شده',
                'family_id' => $otherFamily->id,
                'campaign' => 'new-campaign',
                'topic' => 'موضوع جدید',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'لینک ویرایش‌شده')
            ->assertJsonPath('data.family_id', $otherFamily->id)
            ->assertJsonPath('data.campaign', 'new-campaign')
            ->assertJsonPath('data.topic', 'موضوع جدید');

        $this->assertDatabaseHas('family_entry_links', [
            'id' => $linkId,
            'name' => 'لینک ویرایش‌شده',
            'family_id' => $otherFamily->id,
        ]);

        $otherFamily->refresh();
        $this->assertSame((int) $create->json('data.entry_event_id'), $otherFamily->entry_event_id);
    }

    public function test_entry_links_index_can_filter_by_family(): void
    {
        $familyA = \App\Models\Family::query()->create([
            'internal_name' => 'الف',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $familyB = \App\Models\Family::query()->create([
            'internal_name' => 'ب',
            'lifecycle' => 'forming',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $this->actingAs($this->manager, 'sanctum')->postJson('/api/v1/family-manager/entry-links', [
            'name' => 'لینک الف',
            'source' => 'instagram_reel',
            'family_id' => $familyA->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')->postJson('/api/v1/family-manager/entry-links', [
            'name' => 'لینک ب',
            'source' => 'instagram_story',
            'family_id' => $familyB->id,
        ]);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/family-manager/entry-links?family_id='.$familyA->id);

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertSame(['لینک الف'], $names);
    }
}
