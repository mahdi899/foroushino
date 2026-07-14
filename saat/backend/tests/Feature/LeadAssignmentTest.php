<?php

use App\Actions\Leads\AssignNextLeadAction;
use App\Enums\LeadStatus;

beforeEach(function () {
    seedRoles();
});

it('assigns the only eligible lead to the requesting agent and locks it', function () {
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['product_id' => $product->id, 'conversion_probability' => 90]);

    $result = app(AssignNextLeadAction::class)->execute($agent);

    expect($result['lead'])->not->toBeNull();
    expect($result['lead']->id)->toBe($lead->id);
    expect($result['lead']->assigned_agent_id)->toBe($agent->id);
    expect($result['lead']->locked_by)->toBe($agent->id);
    expect($result['lead']->status)->toBe(LeadStatus::Queued);
    expect($result['reason'])->not->toBeNull();
});

it('never assigns the same lead to two different agents at once (no double lock)', function () {
    $agentA = makeAgent();
    $agentB = makeAgent();
    $product = makeProduct();
    makeLead(['product_id' => $product->id, 'conversion_probability' => 90]);

    $resultA = app(AssignNextLeadAction::class)->execute($agentA);
    $resultB = app(AssignNextLeadAction::class)->execute($agentB);

    expect($resultA['lead'])->not->toBeNull();
    // The only lead in the pool is now locked to agent A, so agent B gets nothing.
    expect($resultB['lead'])->toBeNull();
});

it('excludes do-not-call leads from the assignment cycle', function () {
    $agent = makeAgent();
    makeLead(['do_not_call_at' => now(), 'status' => 'do_not_call']);

    $result = app(AssignNextLeadAction::class)->execute($agent);

    expect($result['lead'])->toBeNull();
});

it('excludes won, lost, and duplicate leads from the assignment cycle', function () {
    $agent = makeAgent();
    makeLead(['status' => 'won']);
    makeLead(['status' => 'lost']);
    makeLead(['status' => 'duplicate']);

    $result = app(AssignNextLeadAction::class)->execute($agent);

    expect($result['lead'])->toBeNull();
});

it('prioritises an overdue follow-up lead over a fresh high-probability lead', function () {
    $agent = makeAgent();
    $fresh = makeLead(['call_count' => 0, 'conversion_probability' => 95, 'temperature' => 'hot']);
    $overdue = makeLead([
        'call_count' => 2,
        'status' => 'follow_up_required',
        'next_followup_at' => now()->subDays(2),
        'temperature' => 'warm',
    ]);

    $result = app(AssignNextLeadAction::class)->execute($agent);

    expect($result['lead']->id)->toBe($overdue->id);
    expect($result['reason']->value)->toBe('overdue_follow_up');
    expect($fresh->fresh()->assigned_agent_id)->toBeNull();
});

it('re-offers a lead already assigned to the same agent for follow-up', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'status' => 'follow_up_required', 'next_followup_at' => now()->subHour()]);

    $result = app(AssignNextLeadAction::class)->execute($agent);

    expect($result['lead']->id)->toBe($lead->id);
});

it('assigns a unique numeric display code to each lead based on its id', function (): void {
    $first = makeLead();
    $second = makeLead();

    expect($first->display_code)->toBe(\App\Models\Lead::displayCodeForId($first->id))
        ->and($second->display_code)->toBe(\App\Models\Lead::displayCodeForId($second->id))
        ->and($first->display_code)->not->toBe($second->display_code);
});
