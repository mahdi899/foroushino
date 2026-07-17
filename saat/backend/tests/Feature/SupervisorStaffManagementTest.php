<?php

use App\Models\Team;
use App\Support\SupervisorCapacity;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedRoles();
});

it('lets a manager create a supervisor account', function () {
    $manager = makeManager();
    Sanctum::actingAs($manager);

    $response = $this->postJson('/api/v1/admin/users', [
        'name' => 'ناظر جدید',
        'phone' => '09129990001',
        'role' => 'supervisor',
    ]);

    $response->assertCreated();
    expect($response->json('data.roles'))->toContain('supervisor');
});

it('forbids a supervisor from creating another supervisor', function () {
    $supervisor = makeSupervisor();
    Sanctum::actingAs($supervisor);

    $this->postJson('/api/v1/admin/users', [
        'name' => 'ناظر دوم',
        'phone' => '09129990002',
        'role' => 'supervisor',
    ])->assertForbidden();
});

it('lets a supervisor create a leader for one of their teams', function () {
    $supervisor = makeSupervisor();
    $team = makeTeam(['supervisor_id' => $supervisor->id]);
    Sanctum::actingAs($supervisor);

    $response = $this->postJson('/api/v1/admin/users', [
        'name' => 'سرتیم تست',
        'phone' => '09129990003',
        'role' => 'leader',
        'team_id' => $team->id,
    ]);

    $response->assertCreated();
    expect($team->fresh()->leader_id)->toBe($response->json('data.id'));
});

it('limits each supervisor to five teams', function () {
    $supervisor = makeSupervisor();
    Sanctum::actingAs($supervisor);

    foreach (range(1, SupervisorCapacity::TEAMS_PER_SUPERVISOR) as $i) {
        $this->postJson('/api/v1/admin/teams', ['name' => "تیم {$i}"])
            ->assertCreated();
    }

    $this->postJson('/api/v1/admin/teams', ['name' => 'تیم اضافه'])
        ->assertForbidden();
});

it('lists only teams supervised by the logged-in supervisor', function () {
    $supervisor = makeSupervisor();
    $mine = makeTeam(['name' => 'تیم من', 'supervisor_id' => $supervisor->id]);
    makeTeam(['name' => 'تیم دیگر']);

    Sanctum::actingAs($supervisor);

    $response = $this->getJson('/api/v1/admin/teams');
    $response->assertOk();

    $names = collect($response->json('data'))->pluck('name');
    expect($names)->toContain('تیم من');
    expect($names)->not->toContain('تیم دیگر');
});

it('lets a manager assign a new team to a supervisor', function () {
    $manager = makeManager();
    $supervisor = makeSupervisor();
    Sanctum::actingAs($manager);

    $response = $this->postJson('/api/v1/admin/teams', [
        'name' => 'تیم ناظر',
        'supervisor_id' => $supervisor->id,
    ]);

    $response->assertCreated();
    expect(Team::query()->where('name', 'تیم ناظر')->value('supervisor_id'))->toBe($supervisor->id);
});

it('lets a leader assign agents to their team roster', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $agent = makeAgent();
    Sanctum::actingAs($leader);

    $response = $this->patchJson("/api/v1/admin/users/{$agent->id}", [
        'team_id' => $team->id,
    ]);

    $response->assertOk();
    expect($agent->fresh()->team_id)->toBe($team->id);
});
