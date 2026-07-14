<?php

use Laravel\Sanctum\Sanctum;

beforeEach(fn () => seedRoles());

it('auto-assigns an unassigned pool lead when the agent starts a call', function () {
    $agent = makeAgent();
    Sanctum::actingAs($agent);
    $lead = makeLead(['assigned_agent_id' => null, 'assigned_team_id' => $agent->team_id]);

    $this->postJson('/api/v1/calls/start', [
        'lead_id' => $lead->id,
        'method' => 'native',
    ])->assertOk();

    expect($lead->fresh()->assigned_agent_id)->toBe($agent->id);
});

it('rejects call start for a lead assigned to another agent', function () {
    $agent = makeAgent();
    $other = makeAgent();
    Sanctum::actingAs($agent);
    $lead = makeLead(['assigned_agent_id' => $other->id]);

    $this->postJson('/api/v1/calls/start', [
        'lead_id' => $lead->id,
        'method' => 'native',
    ])->assertForbidden();
});
