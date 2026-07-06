<?php

use App\Actions\Calls\SubmitCallResultAction;
use App\Enums\LeadStatus;

beforeEach(function () {
    seedRoles();
});

it('routes an interested result to a follow-up required lead status and creates a follow-up', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    $result = app(SubmitCallResultAction::class)->execute($call, [
        'result' => 'interested',
        'note' => 'مشتری علاقه‌مند بود',
        'follow_up' => ['due_at' => now()->addDay()->toIso8601String()],
    ]);

    expect($result['lead']->status)->toBe(LeadStatus::FollowUpRequired);
    expect($result['follow_up'])->not->toBeNull();
    expect($result['follow_up']->lead_id)->toBe($lead->id);
    expect($result['lead']->next_followup_at)->not->toBeNull();
});

it('routes a payment_pending result to a payment_pending sale', function () {
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'product_id' => $product->id]);
    $call = startCallFor($agent, $lead);

    $result = app(SubmitCallResultAction::class)->execute($call, [
        'result' => 'payment_pending',
        'sale' => ['amount' => 3_000_000, 'product_id' => $product->id],
    ]);

    expect($result['lead']->status)->toBe(LeadStatus::PaymentPending);
    expect($result['sale'])->not->toBeNull();
    expect($result['sale']->status->value)->toBe('payment_pending');
});

it('routes a registered result directly to a sale pending confirmation and notifies managers', function () {
    $manager = makeManager();
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'product_id' => $product->id]);
    $call = startCallFor($agent, $lead);

    $result = app(SubmitCallResultAction::class)->execute($call, [
        'result' => 'registered',
        'sale' => ['amount' => 3_000_000, 'product_id' => $product->id],
    ]);

    expect($result['lead']->status)->toBe(LeadStatus::SalePendingConfirmation);
    expect($result['sale']->status->value)->toBe('pending_confirmation');
    expect($manager->appNotifications()->count())->toBe(1);
});

it('routes a do_not_disturb result to do_not_call and excludes the lead from future assignment', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    $result = app(SubmitCallResultAction::class)->execute($call, ['result' => 'do_not_disturb']);

    expect($result['lead']->status)->toBe(LeadStatus::DoNotCall);
    expect($result['lead']->do_not_call_at)->not->toBeNull();

    $another = makeAgent();
    $assign = app(\App\Actions\Leads\AssignNextLeadAction::class)->execute($another);
    expect($assign['lead'])->toBeNull();
});

it('routes a duplicate result to duplicate status', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    $result = app(SubmitCallResultAction::class)->execute($call, ['result' => 'duplicate']);

    expect($result['lead']->status)->toBe(LeadStatus::Duplicate);
});

it('routes an incomplete_call result to needs_supervisor_review and notifies supervisors', function () {
    $supervisor = makeSupervisor();
    $agent = makeAgent(['team_id' => $supervisor->team_id]);
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    $result = app(SubmitCallResultAction::class)->execute($call, ['result' => 'incomplete_call']);

    expect($result['lead']->status)->toBe(LeadStatus::NeedsSupervisorReview);
    expect($supervisor->appNotifications()->count())->toBe(1);
});

it('is idempotent: submitting a result twice for the same call does not double-process', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    $action = app(SubmitCallResultAction::class);
    $first = $action->execute($call, ['result' => 'interested', 'follow_up' => ['due_at' => now()->addDay()->toIso8601String()]]);
    $second = $action->execute($call->fresh(), ['result' => 'not_interested']);

    expect($second['call']->result->value)->toBe('interested');
    expect($lead->fresh()->call_count)->toBe(1);
    expect(\App\Models\FollowUp::where('lead_id', $lead->id)->count())->toBe(1);
});

it('releases the lead lock after a call result is submitted', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'locked_by' => $agent->id, 'locked_until' => now()->addMinutes(20)]);
    $call = startCallFor($agent, $lead);

    $result = app(SubmitCallResultAction::class)->execute($call, ['result' => 'no_answer']);

    expect($result['lead']->locked_by)->toBeNull();
    expect($result['lead']->locked_until)->toBeNull();
});
