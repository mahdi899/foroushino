<?php

use App\Enums\Availability;
use App\Models\UserWorkSession;
use Carbon\Carbon;

beforeEach(function () {
    seedRoles();
});

it('starts a streak at 1 on the very first shift', function () {
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/start')->assertOk();

    expect($agent->fresh()->streak)->toBe(1);
});

it('extends the streak when the previous shift was exactly the day before', function () {
    $agent = makeAgent(['streak' => 4]);
    UserWorkSession::query()->create([
        'user_id' => $agent->id,
        'started_at' => now()->subDay(),
        'ended_at' => now()->subDay()->addHours(6),
    ]);

    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/start')->assertOk();

    expect($agent->fresh()->streak)->toBe(5);
});

it('resets the streak to 1 after a gap of more than a day', function () {
    $agent = makeAgent(['streak' => 10]);
    UserWorkSession::query()->create([
        'user_id' => $agent->id,
        'started_at' => now()->subDays(3),
        'ended_at' => now()->subDays(3)->addHours(6),
    ]);

    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/start')->assertOk();

    expect($agent->fresh()->streak)->toBe(1);
});

it('does not change the streak when starting a shift that is already open today', function () {
    $agent = makeAgent(['streak' => 3]);
    UserWorkSession::query()->create(['user_id' => $agent->id, 'started_at' => now()]);

    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/start')->assertOk();

    expect($agent->fresh()->streak)->toBe(3);
});

it('tracks productive seconds while doing follow up', function () {
    $agent = makeAgent();

    Carbon::setTestNow('2026-07-12 09:00:00');
    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/start', [
        'availability' => Availability::DoingFollowUp->value,
    ])->assertOk();

    Carbon::setTestNow('2026-07-12 09:45:00');
    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/availability', [
        'availability' => Availability::OnBreak->value,
    ])->assertOk();

    $session = UserWorkSession::query()->where('user_id', $agent->id)->first();

    expect($session->total_productive_seconds)->toBe(2700)
        ->and($session->total_break_seconds)->toBe(0);
});

it('tracks productive seconds only while available or in call', function () {
    $agent = makeAgent();

    Carbon::setTestNow('2026-07-12 09:00:00');
    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/start', [
        'availability' => Availability::Available->value,
    ])->assertOk();

    Carbon::setTestNow('2026-07-12 10:00:00');
    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/availability', [
        'availability' => Availability::OnBreak->value,
    ])->assertOk();

    Carbon::setTestNow('2026-07-12 10:30:00');
    $this->actingAs($agent, 'sanctum')->postJson('/api/v1/shift/availability', [
        'availability' => Availability::Available->value,
    ])->assertOk();

    $session = UserWorkSession::query()->where('user_id', $agent->id)->first();

    expect($session->total_productive_seconds)->toBe(3600)
        ->and($session->total_break_seconds)->toBe(1800);
});

it('returns shift history grouped by day', function () {
    $agent = makeAgent();

    UserWorkSession::query()->create([
        'user_id' => $agent->id,
        'started_at' => now()->subDay()->setTime(9, 0),
        'ended_at' => now()->subDay()->setTime(17, 0),
        'total_productive_seconds' => 7200,
        'total_break_seconds' => 900,
        'total_call_seconds' => 1200,
    ]);

    $response = $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/shift/history?days=7')
        ->assertOk();

    $yesterday = now()->subDay()->toDateString();
    $day = collect($response->json('data'))->firstWhere('date', $yesterday);

    expect($day)->not->toBeNull()
        ->and($day['total_productive_seconds'])->toBe(7200)
        ->and($day['sessions_count'])->toBe(1);
});
