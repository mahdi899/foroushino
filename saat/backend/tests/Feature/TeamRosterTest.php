<?php

use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedRoles();
});

it('lets an agent view their team roster with leader and supervisor', function () {
    $supervisor = makeSupervisor();
    $team = makeTeam(['name' => 'تیم الف', 'supervisor_id' => $supervisor->id]);
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $agent = makeAgent(['team_id' => $team->id, 'name' => 'کارشناس دمو']);
    $peer = makeAgent(['team_id' => $team->id, 'name' => 'هم‌تیمی دوم']);

    Sanctum::actingAs($agent);

    $response = $this->getJson('/api/v1/team/roster');

    $response->assertOk()
        ->assertJsonPath('data.team.name', 'تیم الف')
        ->assertJsonPath('data.leader.id', $leader->id)
        ->assertJsonPath('data.supervisor.id', $supervisor->id);

    $agentIds = collect($response->json('data.agents'))->pluck('agent.id')->all();

    expect($agentIds)->toContain($agent->id, $peer->id);
});

it('includes monthly points and ranks agents by monthly performance stats', function () {
    $team = makeTeam(['name' => 'تیم ماهانه', 'supervisor_id' => makeSupervisor()->id]);
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);

    $topAgent = makeAgent(['team_id' => $team->id, 'name' => 'برتر ماه', 'points' => 10]);
    $lowAgent = makeAgent(['team_id' => $team->id, 'name' => 'ضعیف ماه', 'points' => 9000]);
    $product = makeProduct();

    for ($i = 0; $i < 2; $i++) {
        $lead = makeLead(['assigned_agent_id' => $topAgent->id, 'product_id' => $product->id]);
        $call = startCallFor($topAgent, $lead);
        app(\App\Actions\Calls\SubmitCallResultAction::class)->execute($call, ['result' => 'interested']);
    }

    Sanctum::actingAs($lowAgent);

    $response = $this->getJson('/api/v1/team/roster');

    $response->assertOk();

    $entries = collect($response->json('data.agents'));
    $top = $entries->firstWhere('agent.id', $topAgent->id);
    $low = $entries->firstWhere('agent.id', $lowAgent->id);

    expect($top['points_this_month'])->toBeGreaterThan($low['points_this_month']);
});

it('forbids an agent from viewing another teams roster', function () {
    $teamA = makeTeam(['name' => 'تیم الف']);
    $teamB = makeTeam(['name' => 'تیم ب']);
    $agent = makeAgent(['team_id' => $teamA->id]);

    Sanctum::actingAs($agent);

    $this->getJson('/api/v1/team/roster?team_id='.$teamB->id)
        ->assertOk()
        ->assertJsonPath('data.team.id', $teamA->id);
});

it('returns 404 when agent has no team', function () {
    $agent = makeAgent(['team_id' => null]);

    Sanctum::actingAs($agent);

    $this->getJson('/api/v1/team/roster')->assertNotFound();
});
