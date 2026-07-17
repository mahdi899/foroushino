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
