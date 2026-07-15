<?php

use App\Models\AppSetting;

beforeEach(fn () => seedRoles());

it('exposes runtime app config to authenticated users', function () {
    AppSetting::syncMany(['min_call_duration_sec' => 0, 'call_lock_minutes' => 25]);
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/app-config')
        ->assertOk()
        ->assertJsonPath('data.min_call_duration_sec', 0)
        ->assertJsonPath('data.call_lock_minutes', 25);
});

it('exposes business calendar settings', function () {
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/app-config')
        ->assertOk()
        ->assertJsonPath('data.business_timezone', 'Asia/Tehran')
        ->assertJsonPath('data.agents_per_team', 15)
        ->assertJsonStructure(['data' => ['business_date']]);
});

it('defaults min call duration to zero when unset', function () {
    $agent = makeAgent();

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/app-config')
        ->assertOk()
        ->assertJsonPath('data.min_call_duration_sec', 0);
});
