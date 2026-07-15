<?php

use App\Enums\AgentReportStatus;
use App\Models\AgentReport;

beforeEach(function () {
    seedRoles();
});

it('lets an agent submit a daily report for leader approval', function () {
    $team = makeTeam();
    $agent = makeAgent(['team_id' => $team->id]);

    $response = $this->actingAs($agent, 'sanctum')->postJson('/api/v1/agent-reports', [
        'agent_notes' => 'امروز ۱۲ تماس داشتم.',
    ]);

    $response->assertOk();
    expect(AgentReport::query()->where('agent_id', $agent->id)->count())->toBe(1);
    expect(AgentReport::first()->status)->toBe(AgentReportStatus::Submitted);
});

it('lets a leader approve an agent daily report', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $agent = makeAgent(['team_id' => $team->id]);

    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/agent-reports')->assertOk();
    $report = AgentReport::first();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/v1/agent-reports/{$report->id}/approve", [
            'leader_notes' => 'عملکرد خوب بود.',
        ])
        ->assertOk();

    expect($report->fresh()->status)->toBe(AgentReportStatus::Approved);
});

it('lets a leader reject an agent daily report', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $agent = makeAgent(['team_id' => $team->id]);

    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/agent-reports')->assertOk();
    $report = AgentReport::first();

    $this->actingAs($leader, 'sanctum')
        ->postJson("/api/v1/agent-reports/{$report->id}/reject", [
            'leader_notes' => 'نیاز به توضیح بیشتر.',
        ])
        ->assertOk();

    expect($report->fresh()->status)->toBe(AgentReportStatus::Rejected);
});

it('forbids an agent from approving agent reports', function () {
    $team = makeTeam();
    $agent = makeAgent(['team_id' => $team->id]);

    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/agent-reports')->assertOk();
    $report = AgentReport::first();

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/agent-reports/{$report->id}/approve")
        ->assertForbidden();
});

it('returns lead timeline for leaders viewing team customers', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $agent = makeAgent(['team_id' => $team->id]);
    $lead = makeLead(['assigned_agent_id' => $agent->id, 'assigned_team_id' => $team->id]);

    $this->actingAs($leader, 'sanctum')
        ->getJson("/api/v1/leads/{$lead->id}/timeline")
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['calls', 'followups', 'status_histories', 'sales'],
        ]);
});

it('lets a leader see team activity logs', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $agent = makeAgent(['team_id' => $team->id]);

    $agent->activityLogs()->create([
        'kind' => 'call',
        'title' => 'تماس با مشتری',
        'meta' => 'تست',
    ]);

    $response = $this->actingAs($leader, 'sanctum')->getJson('/api/v1/activity');

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('title'))->toContain('تماس با مشتری');
});
