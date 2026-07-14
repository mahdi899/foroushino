<?php

use App\Enums\TeamReportStatus;
use App\Models\TeamReport;

beforeEach(function () {
    seedRoles();
});

it('lets a leader submit a daily team report', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);

    $response = $this->actingAs($leader, 'sanctum')->postJson('/api/v1/team-reports', [
        'leader_notes' => 'تیم امروز خوب عمل کرد.',
    ]);

    $response->assertOk();
    expect(TeamReport::query()->where('team_id', $team->id)->count())->toBe(1);
    expect(TeamReport::first()->status)->toBe(TeamReportStatus::Submitted);
});

it('lets a supervisor approve and forward a team report to management', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $supervisor = makeSupervisor();

    $this->actingAs($leader, 'sanctum')->postJson('/api/v1/team-reports')->assertOk();
    $report = TeamReport::first();

    $this->actingAs($supervisor, 'sanctum')
        ->postJson("/api/v1/team-reports/{$report->id}/approve", [
            'supervisor_notes' => 'تایید شد.',
        ])
        ->assertOk();

    expect($report->fresh()->status)->toBe(TeamReportStatus::Approved);

    $this->actingAs($supervisor, 'sanctum')
        ->postJson("/api/v1/team-reports/{$report->id}/forward")
        ->assertOk();

    expect($report->fresh()->status)->toBe(TeamReportStatus::ForwardedToManager);
});

it('forbids a leader from approving team reports', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);

    $this->actingAs($leader, 'sanctum')->postJson('/api/v1/team-reports')->assertOk();
    $report = TeamReport::first();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/v1/team-reports/{$report->id}/approve")
        ->assertForbidden();
});
