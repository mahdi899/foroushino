<?php

use App\Enums\FollowupStatus;
use App\Enums\LeadStatus;
use App\Models\FollowUp;

beforeEach(function () {
    seedRoles();
});

it('releases stale lead locks whose lock window has expired', function () {
    $agent = makeAgent();
    $stale = makeLead(['locked_by' => $agent->id, 'locked_until' => now()->subMinutes(5)]);
    $fresh = makeLead(['locked_by' => $agent->id, 'locked_until' => now()->addMinutes(5)]);

    $this->artisan('leads:release-stale-locks')->assertSuccessful();

    expect($stale->fresh()->locked_by)->toBeNull();
    expect($stale->fresh()->locked_until)->toBeNull();
    expect($fresh->fresh()->locked_by)->toBe($agent->id);
});

it('marks pending follow-ups past their due date as overdue and flips the lead status', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'status' => 'follow_up_required']);
    $followUp = FollowUp::query()->create([
        'lead_id' => $lead->id,
        'agent_id' => $agent->id,
        'kind' => 'call',
        'title' => 'پیگیری تست',
        'due_at' => now()->subHours(2),
        'status' => FollowupStatus::Pending,
    ]);

    $this->artisan('followups:mark-overdue')->assertSuccessful();

    expect($followUp->fresh()->status)->toBe(FollowupStatus::Overdue);
    expect($lead->fresh()->status)->toBe(LeadStatus::FollowUpOverdue);
});

it('leaves follow-ups that are not yet due untouched', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'status' => 'follow_up_required']);
    $followUp = FollowUp::query()->create([
        'lead_id' => $lead->id,
        'agent_id' => $agent->id,
        'kind' => 'call',
        'title' => 'پیگیری آینده',
        'due_at' => now()->addHours(2),
        'status' => FollowupStatus::Pending,
    ]);

    $this->artisan('followups:mark-overdue')->assertSuccessful();

    expect($followUp->fresh()->status)->toBe(FollowupStatus::Pending);
    expect($lead->fresh()->status)->toBe(LeadStatus::FollowUpRequired);
});
