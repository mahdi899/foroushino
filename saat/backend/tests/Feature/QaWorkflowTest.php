<?php

use App\Enums\CallResult;
use App\Models\QualityReview;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedRoles();
});

it('creates a pending quality review when incomplete call is submitted', function () {
    $agent = makeAgent();
    Sanctum::actingAs($agent);
    $supervisor = makeSupervisor(['team_id' => $agent->team_id]);
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    $this->postJson("/api/v1/calls/{$call->id}/result", [
        'result' => CallResult::IncompleteCall->value,
        'duration_sec' => 5,
        'note' => 'قطع شد',
    ])->assertSuccessful();

    $review = QualityReview::query()->where('call_id', $call->id)->first();
    expect($review)->not->toBeNull();
    expect($review->status)->toBe('pending');
    expect($review->reviewer_id)->toBe($supervisor->id);
});

it('lets supervisors score a quality review', function () {
    $agent = makeAgent();
    $supervisor = makeSupervisor(['team_id' => $agent->team_id]);
    Sanctum::actingAs($supervisor);
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    $review = QualityReview::query()->create([
        'call_id' => $call->id,
        'reviewer_id' => $supervisor->id,
        'agent_id' => $agent->id,
        'score' => 0,
        'status' => 'pending',
    ]);

    $this->patchJson("/api/v1/quality/reviews/{$review->id}", [
        'score' => 88,
        'criteria_scores' => ['greeting' => 90, 'closing' => 85],
        'notes' => 'خوب بود',
        'status' => 'reviewed',
    ])->assertSuccessful()
        ->assertJsonPath('data.score', 88)
        ->assertJsonPath('data.status', 'reviewed');
});

it('lets supervisors complete coaching tasks', function () {
    $agent = makeAgent();
    $supervisor = makeSupervisor(['team_id' => $agent->team_id]);
    Sanctum::actingAs($supervisor);

    $task = \App\Models\CoachingTask::query()->create([
        'agent_id' => $agent->id,
        'coach_id' => $supervisor->id,
        'title' => 'تمرین پایان تماس',
        'status' => 'open',
    ]);

    $this->patchJson("/api/v1/quality/coaching-tasks/{$task->id}", [
        'status' => 'completed',
    ])->assertSuccessful()
        ->assertJsonPath('data.status', 'completed');
});
