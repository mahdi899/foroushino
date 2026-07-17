<?php

use App\Actions\Leads\AssignNextLeadAction;
use App\Actions\Leads\ClaimLeadForCallAction;
use App\Models\Lead;

beforeEach(function () {
    seedRoles();
});

it('does not let a loaded agent pull new pool leads while a teammate has fewer assignments', function () {
    $team = makeTeam();
    $agentA = makeAgent(['team_id' => $team->id]);
    $agentB = makeAgent(['team_id' => $team->id]);

    foreach (range(1, 3) as $i) {
        makeLead([
            'assigned_agent_id' => $agentA->id,
            'assigned_team_id' => $team->id,
            'status' => 'assigned',
        ]);
    }

    $poolLead = makeLead([
        'assigned_team_id' => $team->id,
        'status' => 'assigned',
        'conversion_probability' => 90,
    ]);

    $resultA = app(AssignNextLeadAction::class)->execute($agentA);
    $resultB = app(AssignNextLeadAction::class)->execute($agentB);

    expect($resultA['lead']?->id)->not->toBe($poolLead->id);
    expect($resultB['lead'])->not->toBeNull();
    expect($resultB['lead']->id)->toBe($poolLead->id);
    expect($resultB['lead']->assigned_agent_id)->toBe($agentB->id);
});

it('balances pool pulls between agents with equal workload', function () {
    $team = makeTeam();
    $agentA = makeAgent(['team_id' => $team->id]);
    $agentB = makeAgent(['team_id' => $team->id]);

    foreach (range(1, 4) as $i) {
        makeLead([
            'assigned_team_id' => $team->id,
            'status' => 'assigned',
            'conversion_probability' => 50 + $i,
        ]);
    }

    app(AssignNextLeadAction::class)->execute($agentA);
    app(AssignNextLeadAction::class)->execute($agentB);
    app(AssignNextLeadAction::class)->execute($agentA);
    app(AssignNextLeadAction::class)->execute($agentB);

    expect(Lead::query()->where('assigned_agent_id', $agentA->id)->count())->toBe(2);
    expect(Lead::query()->where('assigned_agent_id', $agentB->id)->count())->toBe(2);
});

it('blocks an overloaded agent from claiming a pool lead directly for a call', function () {
    $team = makeTeam();
    $agentA = makeAgent(['team_id' => $team->id]);
    $agentB = makeAgent(['team_id' => $team->id]);

    foreach (range(1, 2) as $i) {
        makeLead([
            'assigned_agent_id' => $agentA->id,
            'assigned_team_id' => $team->id,
            'status' => 'assigned',
        ]);
    }

    $poolLead = makeLead([
        'assigned_team_id' => $team->id,
        'status' => 'assigned',
    ]);

    expect(fn () => app(ClaimLeadForCallAction::class)->execute($agentA, $poolLead))
        ->toThrow(\Symfony\Component\HttpKernel\Exception\HttpException::class);

    $claimed = app(ClaimLeadForCallAction::class)->execute($agentB, $poolLead);
    expect($claimed->assigned_agent_id)->toBe($agentB->id);
});

it('still lets an agent pull their own follow-up leads even when they are overloaded', function () {
    $team = makeTeam();
    $agentA = makeAgent(['team_id' => $team->id]);
    makeAgent(['team_id' => $team->id]);

    foreach (range(1, 3) as $i) {
        makeLead([
            'assigned_agent_id' => $agentA->id,
            'assigned_team_id' => $team->id,
            'status' => 'assigned',
        ]);
    }

    $followUp = makeLead([
        'assigned_agent_id' => $agentA->id,
        'assigned_team_id' => $team->id,
        'status' => 'follow_up_required',
        'next_followup_at' => now()->subHour(),
    ]);

    makeLead([
        'assigned_team_id' => $team->id,
        'status' => 'assigned',
        'conversion_probability' => 99,
    ]);

    $result = app(AssignNextLeadAction::class)->execute($agentA);

    expect($result['lead'])->not->toBeNull();
    expect($result['lead']->id)->toBe($followUp->id);
});
