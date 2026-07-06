<?php

beforeEach(function () {
    seedRoles();
});

it('forbids an agent without reports.view from reading the pipeline report', function () {
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')->getJson('/api/v1/reports/pipeline')->assertForbidden();
});

it('lets a manager read the pipeline report grouped by lead status', function () {
    $manager = makeManager();
    makeLead(['status' => 'new']);
    makeLead(['status' => 'won']);

    $response = $this->actingAs($manager, 'sanctum')->getJson('/api/v1/reports/pipeline');

    $response->assertOk();
    expect($response->json('data.new'))->toBe(1);
    expect($response->json('data.won'))->toBe(1);
});

it('scopes a supervisor\'s pipeline report to their own team only', function () {
    $teamA = makeTeam();
    $teamB = makeTeam();
    $supervisor = makeSupervisor(['team_id' => $teamA->id]);
    makeLead(['status' => 'new', 'assigned_team_id' => $teamA->id]);
    makeLead(['status' => 'new', 'assigned_team_id' => $teamB->id]);

    $response = $this->actingAs($supervisor, 'sanctum')->getJson('/api/v1/reports/pipeline');

    $response->assertOk();
    expect($response->json('data.new'))->toBe(1);
});

it('computes source conversion rates', function () {
    $manager = makeManager();
    makeLead(['source' => 'instagram', 'status' => 'won']);
    makeLead(['source' => 'instagram', 'status' => 'new']);

    $response = $this->actingAs($manager, 'sanctum')->getJson('/api/v1/reports/sources');

    $response->assertOk();
    $row = collect($response->json('data'))->firstWhere('source', 'instagram');
    expect($row['total'])->toBe(2);
    expect($row['won'])->toBe(1);
    expect((float) $row['conversion_rate'])->toBe(50.0);
});

it('flags agents with many short "ghost" calls as suspicious', function () {
    $manager = makeManager();
    $agent = makeAgent();
    foreach (range(1, 10) as $i) {
        $lead = makeLead(['assigned_agent_id' => $agent->id]);
        \App\Models\Call::query()->create([
            'lead_id' => $lead->id,
            'agent_id' => $agent->id,
            'result' => 'no_answer',
            'duration_sec' => 1,
            'started_at' => now(),
            'ended_at' => now(),
        ]);
    }

    $response = $this->actingAs($manager, 'sanctum')->getJson('/api/v1/reports/suspicious');

    $response->assertOk();
    $flagged = collect($response->json('data'))->firstWhere('agent_id', $agent->id);
    expect($flagged)->not->toBeNull();
    expect($flagged['reasons'])->not->toBeEmpty();
});
