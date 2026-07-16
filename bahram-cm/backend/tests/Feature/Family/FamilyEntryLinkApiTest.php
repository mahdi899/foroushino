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
        $response = $this->actingAs($this->manager, 'sanctum')
            ->postJson('/api/v1/family-manager/entry-links', [
                'name' => 'ریل 482 — ترس از شروع',
                'source' => 'instagram_reel',
                'campaign' => 'reel-482',
                'topic' => 'ترس از شروع',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'ریل 482 — ترس از شروع')
            ->assertJsonPath('data.source', 'instagram_reel');

        $url = $response->json('data.url');
        $this->assertStringContainsString('/family?', $url);
        $this->assertStringContainsString('entry_event=', $url);
        $this->assertStringContainsString('src=instagram_reel', $url);

        $this->assertDatabaseHas('family_entry_links', [
            'name' => 'ریل 482 — ترس از شروع',
            'source' => 'instagram_reel',
        ]);
    }
}
