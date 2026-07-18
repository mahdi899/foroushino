<?php

use App\Models\User;

beforeEach(function () {
    seedRoles();
});

it('resets all user points to zero', function () {
    $agent = makeAgent(['points' => 420]);
    $leader = makeLeader(['points' => 900]);

    $this->artisan('gamification:reset-monthly-points')->assertSuccessful();

    expect($agent->fresh()->points)->toBe(0)
        ->and($leader->fresh()->points)->toBe(0);
});

it('succeeds when no users have points', function () {
    makeAgent(['points' => 0]);

    $this->artisan('gamification:reset-monthly-points')->assertSuccessful();
});
