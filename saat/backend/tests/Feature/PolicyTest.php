<?php

beforeEach(function () {
    seedRoles();
});

it('lets an agent view only their own assigned lead', function () {
    $agentA = makeAgent();
    $agentB = makeAgent();
    $ownLead = makeLead(['assigned_agent_id' => $agentA->id]);
    $othersLead = makeLead(['assigned_agent_id' => $agentB->id]);

    expect($agentA->can('view', $ownLead))->toBeTrue();
    expect($agentA->can('view', $othersLead))->toBeFalse();
});

it('lets a supervisor view leads across all teams', function () {
    $teamA = makeTeam(['name' => 'تیم الف']);
    $teamB = makeTeam(['name' => 'تیم ب']);
    $supervisor = makeSupervisor(['team_id' => $teamA->id]);
    $leadInTeam = makeLead(['assigned_team_id' => $teamA->id]);
    $leadOutsideTeam = makeLead(['assigned_team_id' => $teamB->id]);

    expect($supervisor->can('view', $leadInTeam))->toBeTrue();
    expect($supervisor->can('view', $leadOutsideTeam))->toBeTrue();
});

it('lets a manager view any lead regardless of team or owner', function () {
    $manager = makeManager();
    $lead = makeLead(['assigned_agent_id' => makeAgent()->id]);

    expect($manager->can('view', $lead))->toBeTrue();
});

it('prevents an agent from locking a lead already assigned to another agent', function () {
    $agentA = makeAgent();
    $agentB = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agentA->id]);

    expect($agentB->can('lock', $lead))->toBeFalse();
    expect($agentA->can('lock', $lead))->toBeTrue();
});

it('lets a manager override and lock a lead assigned to another agent', function () {
    $manager = makeManager();
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);

    expect($manager->can('lock', $lead))->toBeTrue();
});
