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

it('lets a manager assign and unassign teams for a supervisor via bulk endpoint', function () {
    $manager = makeManager();
    $supervisor = makeSupervisor();
    $teamA = makeTeam(['name' => 'تیم الف']);
    $teamB = makeTeam(['name' => 'تیم ب', 'supervisor_id' => $supervisor->id]);
    $teamC = makeTeam(['name' => 'تیم ج']);

    Sanctum::actingAs($manager);

    $this->patchJson("/api/v1/admin/supervisors/{$supervisor->id}/teams", [
        'team_ids' => [$teamA->id, $teamB->id],
    ])->assertOk()
        ->assertJsonPath('message', 'تیم‌های ناظر به‌روزرسانی شد');

    expect($teamA->fresh()->supervisor_id)->toBe($supervisor->id);
    expect($teamB->fresh()->supervisor_id)->toBe($supervisor->id);
    expect($teamC->fresh()->supervisor_id)->toBeNull();

    $this->patchJson("/api/v1/admin/supervisors/{$supervisor->id}/teams", [
        'team_ids' => [],
    ])->assertOk();

    expect($teamA->fresh()->supervisor_id)->toBeNull();
    expect($teamB->fresh()->supervisor_id)->toBeNull();
});

it('syncs team members in one request', function () {
    $manager = makeManager();
    $team = makeTeam();
    $agentA = makeAgent(['team_id' => $team->id]);
    $agentB = makeAgent(['team_id' => $team->id]);
    $agentC = makeAgent();

    Sanctum::actingAs($manager);

    $this->putJson("/api/v1/admin/teams/{$team->id}/members", [
        'agent_ids' => [$agentA->id, $agentC->id],
    ])->assertOk()
        ->assertJsonPath('message', 'اعضای تیم به‌روزرسانی شد');

    expect($agentA->fresh()->team_id)->toBe($team->id);
    expect($agentB->fresh()->team_id)->toBeNull();
    expect($agentC->fresh()->team_id)->toBe($team->id);
});

it('invalidates admin directory cache after team update', function () {
    $manager = makeManager();
    $team = makeTeam(['name' => 'قبل از کش']);

    Sanctum::actingAs($manager);

    $first = $this->getJson('/api/v1/admin/teams')->assertOk();
    expect(collect($first->json('data'))->firstWhere('id', $team->id)['name'])->toBe('قبل از کش');

    $this->patchJson("/api/v1/admin/teams/{$team->id}", [
        'name' => 'بعد از کش',
    ])->assertOk();

    $second = $this->getJson('/api/v1/admin/teams')->assertOk();
    expect(collect($second->json('data'))->firstWhere('id', $team->id)['name'])->toBe('بعد از کش');
});

it('forbids a leader from stealing agents from another team via bulk sync', function () {
    $teamA = makeTeam();
    $teamB = makeTeam();
    $leader = makeLeader(['team_id' => $teamA->id]);
    $teamA->update(['leader_id' => $leader->id]);
    $ownAgent = makeAgent(['team_id' => $teamA->id]);
    $foreignAgent = makeAgent(['team_id' => $teamB->id]);

    Sanctum::actingAs($leader);

    $this->putJson("/api/v1/admin/teams/{$teamA->id}/members", [
        'agent_ids' => [$ownAgent->id, $foreignAgent->id],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['agent_ids']);

    expect($foreignAgent->fresh()->team_id)->toBe($teamB->id);
});

it('forbids supervisors from bulk supervisor team assignment', function () {
    $supervisor = makeSupervisor();
    $otherSupervisor = makeSupervisor();
    $team = makeTeam();

    Sanctum::actingAs($supervisor);

    $this->patchJson("/api/v1/admin/supervisors/{$otherSupervisor->id}/teams", [
        'team_ids' => [$team->id],
    ])->assertForbidden();
});

it('forbids agents from syncing team members', function () {
    $team = makeTeam();
    $agent = makeAgent(['team_id' => $team->id]);

    Sanctum::actingAs($agent);

    $this->putJson("/api/v1/admin/teams/{$team->id}/members", [
        'agent_ids' => [$agent->id],
    ])->assertForbidden();
});

it('lets a manager delete a team and unassign its agents', function () {
    $manager = makeManager();
    $team = makeTeam(['name' => 'تیم حذف']);
    $agent = makeAgent(['team_id' => $team->id]);

    Sanctum::actingAs($manager);

    $this->deleteJson("/api/v1/admin/teams/{$team->id}")
        ->assertOk()
        ->assertJsonPath('message', 'تیم حذف شد');

    $this->assertDatabaseMissing('teams', ['id' => $team->id]);
    expect($agent->fresh()->team_id)->toBeNull();
});

it('forbids a supervisor from deleting another supervisors team', function () {
    $supervisor = makeSupervisor();
    $otherSupervisor = makeSupervisor();
    $team = makeTeam(['supervisor_id' => $otherSupervisor->id]);

    Sanctum::actingAs($supervisor);

    $this->deleteJson("/api/v1/admin/teams/{$team->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('teams', ['id' => $team->id]);
});
