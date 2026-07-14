<?php

use App\Enums\Availability;
use App\Enums\RoleName;
use App\Models\AppSetting;

beforeEach(fn () => seedRoles());

it('uses call_lock_minutes from app settings when starting a call', function () {
    AppSetting::syncMany(['call_lock_minutes' => 45]);
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);

    $this->actingAs($agent, 'sanctum')
        ->postJson('/api/v1/calls/start', ['lead_id' => $lead->id, 'method' => 'native'])
        ->assertOk();

    $lead->refresh();
    expect($lead->locked_until)->not->toBeNull();
    expect($lead->locked_until->greaterThan(now()->addMinutes(44)))->toBeTrue();
});

it('exposes telephony capabilities in app config', function () {
    AppSetting::syncMany([
        'native_call_enabled' => true,
        'voip_enabled' => false,
        'default_call_method' => 'native',
    ]);
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/app-config')
        ->assertOk()
        ->assertJsonPath('data.native_call_enabled', true)
        ->assertJsonPath('data.voip_enabled', false)
        ->assertJsonPath('data.default_call_method', 'native');
});

it('runs full agent call cycle shift to result', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);

    $this->actingAs($agent, 'sanctum')
        ->postJson('/api/v1/shift/start', ['availability' => Availability::Available->value])
        ->assertOk();

    $this->actingAs($agent, 'sanctum')
        ->postJson('/api/v1/calls/start', ['lead_id' => $lead->id, 'method' => 'native'])
        ->assertOk()
        ->assertJsonPath('data.call.method', 'native');

    $callId = $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/calls?lead_id='.$lead->id)
        ->json('data.0.id');

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/calls/{$callId}/reconcile", ['outcome' => 'answered'])
        ->assertOk();

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/calls/{$callId}/result", [
            'result' => 'needs_followup',
            'note' => 'تماس تست',
            'duration_sec' => 90,
            'follow_up' => [
                'due_at' => now()->addDay()->toIso8601String(),
                'kind' => 'call',
                'priority' => 2,
            ],
        ], ['Idempotency-Key' => 'cycle-test-'.uniqid()])
        ->assertOk()
        ->assertJsonPath('data.next_action', 'create_follow_up');

    $this->actingAs($agent, 'sanctum')
        ->postJson('/api/v1/shift/end')
        ->assertOk();
});

it('allows manager to view live ops dashboard', function () {
    $manager = makeManager();
    makeAgent(['team_id' => $manager->team_id]);

    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/live-ops/dashboard')
        ->assertOk()
        ->assertJsonStructure(['data' => ['kpis', 'active_calls', 'queued_leads']]);
});

it('blocks agent from live ops dashboard', function () {
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/live-ops/dashboard')
        ->assertForbidden();
});

it('returns telephony capabilities endpoint', function () {
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/telephony/capabilities')
        ->assertOk()
        ->assertJsonStructure(['data' => ['native_call_enabled', 'voip_enabled', 'default_call_method']]);
});

it('scores a lead via ai assist endpoint', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/ai/leads/{$lead->id}/score")
        ->assertOk()
        ->assertJsonStructure(['data' => ['score', 'factors', 'disclaimer']]);
});
