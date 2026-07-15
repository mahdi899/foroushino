<?php

use App\Models\Lead;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedRoles();
});

it('returns next lead when advance flag is sent with call result', function () {
    $agent = makeAgent();
    Sanctum::actingAs($agent);
    $current = makeLead(['assigned_agent_id' => $agent->id, 'conversion_probability' => 90]);
    $next = makeLead(['conversion_probability' => 80]);
    $call = startCallFor($agent, $current);

    $response = $this->postJson("/api/v1/calls/{$call->id}/result", [
        'result' => 'no_answer',
        'duration_sec' => 12,
        'advance' => true,
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('data.next_lead.id', $next->id);
    $response->assertJsonPath('data.next_reason', 'fresh_high_prob');
});

it('still succeeds when advance assignment fails after the result is saved', function () {
    $agent = makeAgent();
    Sanctum::actingAs($agent);
    $current = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $current);

    $this->mock(\App\Actions\Leads\AssignNextLeadAction::class, function ($mock): void {
        $mock->shouldReceive('execute')->once()->andThrow(
            new RuntimeException('در حال پردازش درخواست قبلی شما هستیم، لطفاً کمی صبر کنید.'),
        );
    });

    $response = $this->postJson("/api/v1/calls/{$call->id}/result", [
        'result' => 'no_answer',
        'duration_sec' => 12,
        'advance' => true,
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('data.call.result', 'no_answer');
    $response->assertJsonMissingPath('data.next_lead');
    expect($call->fresh()->result?->value)->toBe('no_answer');
});

it('still saves call result when broadcast fails', function () {
    $agent = makeAgent();
    Sanctum::actingAs($agent);
    $current = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $current);

    $this->mock(\Illuminate\Contracts\Broadcasting\Factory::class, function ($mock): void {
        $mock->shouldReceive('event')->andThrow(new RuntimeException('Pusher error: 404 Not Found'));
    });

    $response = $this->postJson("/api/v1/calls/{$call->id}/result", [
        'result' => 'no_answer',
        'duration_sec' => 12,
    ]);

    $response->assertSuccessful();
    $response->assertJsonPath('data.call.result', 'no_answer');
    expect($call->fresh()->result?->value)->toBe('no_answer');
});

it('auto returns stale assigned leads to the pool', function () {
    $agent = makeAgent();
    $stale = makeLead([
        'assigned_agent_id' => $agent->id,
        'status' => 'assigned',
        'last_call_at' => null,
    ]);
    $stale->forceFill(['updated_at' => now()->subHours(72)])->saveQuietly();
    $fresh = makeLead([
        'assigned_agent_id' => $agent->id,
        'status' => 'assigned',
        'last_call_at' => now()->subHour(),
    ]);
    $fresh->forceFill(['updated_at' => now()->subHour()])->saveQuietly();

    $this->artisan('leads:auto-return-stale')->assertSuccessful();

    expect($stale->fresh()->status->value)->toBe('returned_to_pool');
    expect($stale->fresh()->assigned_agent_id)->toBeNull();
    expect($fresh->fresh()->assigned_agent_id)->toBe($agent->id);
});
