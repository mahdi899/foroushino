<?php

beforeEach(function () {
    seedRoles();
    $this->seed(\Database\Seeders\LeadSourceSeeder::class);
});

it('lets an admin create a lead source', function () {
    $admin = makeAdmin();

    $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/admin/lead-sources', [
        'slug' => 'referral',
        'label' => 'معرفی دوستان',
        'sort_order' => 80,
    ]);

    $response->assertCreated();
    expect(\App\Models\LeadSourceCatalog::where('slug', 'referral')->exists())->toBeTrue();
});

it('forbids a supervisor from creating a lead source', function () {
    $supervisor = makeSupervisor();

    $this->actingAs($supervisor, 'sanctum')->postJson('/api/v1/admin/lead-sources', [
        'slug' => 'referral-2',
        'label' => 'معرفی دوستان',
    ])->assertForbidden();
});

it('lists active form lead sources publicly', function () {
    $agent = makeAgent();

    $response = $this->actingAs($agent, 'sanctum')->getJson('/api/v1/lead-sources');

    $response->assertOk();
    $slugs = collect($response->json('data'))->pluck('slug')->all();
    expect($slugs)->toContain('instagram');
    expect($slugs)->not->toContain('bahram');
});

it('deactivates a custom lead source instead of deleting it', function () {
    $manager = makeManager();
    $source = \App\Models\LeadSourceCatalog::query()->create([
        'slug' => 'custom-source',
        'label' => 'منبع سفارشی',
        'sort_order' => 100,
        'is_active' => true,
        'is_system' => false,
        'show_in_form' => true,
    ]);

    $this->actingAs($manager, 'sanctum')
        ->deleteJson("/api/v1/admin/lead-sources/{$source->id}")
        ->assertOk();

    expect($source->fresh()->is_active)->toBeFalse();
});

it('forbids deleting a system lead source', function () {
    $manager = makeManager();
    $source = \App\Models\LeadSourceCatalog::query()->where('slug', 'instagram')->firstOrFail();

    $this->actingAs($manager, 'sanctum')
        ->deleteJson("/api/v1/admin/lead-sources/{$source->id}")
        ->assertStatus(422);
});
