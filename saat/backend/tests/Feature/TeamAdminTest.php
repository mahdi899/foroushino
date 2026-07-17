<?php

use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedRoles();
});

it('lets a supervisor create a team', function () {
    $supervisor = makeSupervisor();

    Sanctum::actingAs($supervisor);

    $response = $this->postJson('/api/v1/admin/teams', [
        'name' => 'تیم شمال',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'تیم شمال')
        ->assertJsonPath('data.supervisor_id', $supervisor->id);

    $this->assertDatabaseHas('teams', ['name' => 'تیم شمال', 'supervisor_id' => $supervisor->id]);
});

it('lets a supervisor list only their supervised teams', function () {
    $supervisor = makeSupervisor();
    $teamA = makeTeam(['name' => 'تیم الف', 'supervisor_id' => $supervisor->id]);
    makeTeam(['name' => 'تیم ب']);

    Sanctum::actingAs($supervisor);

    $response = $this->getJson('/api/v1/admin/teams');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('name')->all())
        ->toContain('تیم الف')
        ->not->toContain('تیم ب');
});

it('lets a supervisor update a team leader', function () {
    $supervisor = makeSupervisor();
    $team = makeTeam(['name' => 'تیم مرکز', 'supervisor_id' => $supervisor->id]);
    $leader = makeLeader(['team_id' => $team->id]);

    Sanctum::actingAs($supervisor);

    $response = $this->patchJson("/api/v1/admin/teams/{$team->id}", [
        'leader_id' => $leader->id,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.leader_id', $leader->id);

    expect($team->fresh()->leader_id)->toBe($leader->id);
});

it('forbids agent from creating teams', function () {
    $agent = makeAgent();

    Sanctum::actingAs($agent);

    $this->postJson('/api/v1/admin/teams', ['name' => 'تیم جدید'])
        ->assertForbidden();
});

it('lets a leader unassign an agent from their team roster', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $agent = makeAgent(['team_id' => $team->id]);
    $other = makeAgent(['team_id' => $team->id]);

    Sanctum::actingAs($leader);

    $this->patchJson("/api/v1/admin/users/{$agent->id}", ['team_id' => null])
        ->assertOk();

    expect($agent->fresh()->team_id)->toBeNull();
    expect($other->fresh()->team_id)->toBe($team->id);
});

it('lets a manager update a team without clearing supervisor', function () {
    $manager = makeManager();
    $supervisor = makeSupervisor();
    $team = makeTeam(['supervisor_id' => $supervisor->id]);
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);

    Sanctum::actingAs($manager);

    $this->patchJson("/api/v1/admin/teams/{$team->id}", [
        'name' => 'تیم به‌روز',
        'leader_id' => $leader->id,
    ])->assertOk()
        ->assertJsonPath('data.name', 'تیم به‌روز')
        ->assertJsonPath('data.supervisor_id', $supervisor->id);
});

it('lets a manager assign and unassign teams for a supervisor', function () {
    $manager = makeManager();
    $supervisor = makeSupervisor();
    $teamA = makeTeam(['name' => 'تیم الف']);
    $teamB = makeTeam(['name' => 'تیم ب', 'supervisor_id' => $supervisor->id]);

    Sanctum::actingAs($manager);

    $this->patchJson("/api/v1/admin/teams/{$teamA->id}", [
        'supervisor_id' => $supervisor->id,
    ])->assertOk()
        ->assertJsonPath('data.supervisor_id', $supervisor->id);

    $this->patchJson("/api/v1/admin/teams/{$teamB->id}", [
        'supervisor_id' => null,
    ])->assertOk()
        ->assertJsonPath('data.supervisor_id', null);

    expect($teamA->fresh()->supervisor_id)->toBe($supervisor->id);
    expect($teamB->fresh()->supervisor_id)->toBeNull();
});
