<?php

use App\Models\UserWorkSession;

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
