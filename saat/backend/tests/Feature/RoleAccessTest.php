<?php

beforeEach(function (): void {
    seedRoles();
});

it('lets admin read and update app settings', function (): void {
    $admin = makeAdmin();

    $this->actingAs($admin, 'sanctum')
        ->getJson('/api/v1/admin/settings')
        ->assertOk()
        ->assertJsonPath('data.call_lock_minutes', 30);

    $this->actingAs($admin, 'sanctum')
        ->patchJson('/api/v1/admin/settings', [
            'settings' => ['call_lock_minutes' => 45],
        ])
        ->assertOk()
        ->assertJsonPath('data.call_lock_minutes', 45);
});

it('lets manager read and update app settings', function (): void {
    $manager = makeManager();

    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/admin/settings')
        ->assertOk();

    $this->actingAs($manager, 'sanctum')
        ->patchJson('/api/v1/admin/settings', [
            'settings' => ['call_lock_minutes' => 40],
        ])
        ->assertOk()
        ->assertJsonPath('data.call_lock_minutes', 40);
});

it('lets a supervisor manage training scripts', function (): void {
    $supervisor = makeSupervisor();
    $product = makeProduct();

    $this->actingAs($supervisor, 'sanctum')
        ->postJson('/api/v1/admin/scripts', [
            'product_id' => $product->id,
            'title' => 'اسکریپت تست',
            'stage' => 'first_call',
            'content' => 'سلام، وقت بخیر.',
        ])
        ->assertCreated();

    expect(\App\Models\Script::where('title', 'اسکریپت تست')->exists())->toBeTrue();
});

it('forbids a leader from creating training scripts', function (): void {
    $leader = makeLeader();

    $this->actingAs($leader, 'sanctum')
        ->postJson('/api/v1/admin/scripts', [
            'title' => 'اسکریپت ممنوع',
            'stage' => 'first_call',
            'content' => 'متن',
        ])
        ->assertForbidden();
});

it('lets a manager list and update users', function (): void {
    $manager = makeManager();
    $agent = makeAgent();

    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/admin/users')
        ->assertOk()
        ->assertJsonFragment(['id' => $agent->id]);

    $this->actingAs($manager, 'sanctum')
        ->patchJson("/api/v1/admin/users/{$agent->id}", ['is_active' => false])
        ->assertOk();

    expect($agent->fresh()->is_active)->toBeFalse();
});

it('forbids a supervisor from updating users', function (): void {
    $supervisor = makeSupervisor();
    $agent = makeAgent();

    $this->actingAs($supervisor, 'sanctum')
        ->patchJson("/api/v1/admin/users/{$agent->id}", ['is_active' => false])
        ->assertForbidden();
});

it('forbids a leader from confirming a sale via API', function (): void {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $agent = makeAgent(['team_id' => $team->id]);
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'assigned_team_id' => $team->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/v1/sales/{$sale->id}/confirm")
        ->assertForbidden();
});

it('lets a supervisor confirm a sale via API', function (): void {
    $team = makeTeam();
    $supervisor = makeSupervisor(['team_id' => $team->id]);
    $agent = makeAgent(['team_id' => $team->id]);
    $product = makeProduct(['commission_rate' => 10]);
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'assigned_team_id' => $team->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');

    $this->actingAs($supervisor, 'sanctum')
        ->postJson("/api/v1/sales/{$sale->id}/confirm")
        ->assertOk()
        ->assertJsonPath('data.sale.status', 'confirmed');
});
