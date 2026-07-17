<?php

beforeEach(function () {
    seedRoles();
});

it('rejects invalid operational values from the settings screen', function () {
    $manager = makeManager();

    $this->actingAs($manager, 'sanctum')
        ->patchJson('/api/v1/admin/settings', [
            'settings' => [
                'lead_pool_auto_return_hours' => 0,
            ],
        ])
        ->assertUnprocessable();
});

it('rejects invalid qa sample percent', function () {
    $manager = makeManager();

    $this->actingAs($manager, 'sanctum')
        ->patchJson('/api/v1/admin/settings', [
            'settings' => [
                'qa_sample_percent' => 150,
            ],
        ])
        ->assertUnprocessable();
});

it('rejects invalid default call method', function () {
    $manager = makeManager();

    $this->actingAs($manager, 'sanctum')
        ->patchJson('/api/v1/admin/settings', [
            'settings' => [
                'default_call_method' => 'invalid',
            ],
        ])
        ->assertUnprocessable();
});

it('saves all known settings together like the admin settings screen', function () {
    $manager = makeManager();
    $defaults = \App\Models\AppSetting::defaults();

    $settings = [];
    foreach ($defaults as $key => $value) {
        if (is_bool($value)) {
            $settings[$key] = $value;
            continue;
        }

        if (str_starts_with($key, 'meli_pattern_')) {
            $settings[$key] = (int) $value;
            continue;
        }

        $settings[$key] = $value;
    }

    $this->actingAs($manager, 'sanctum')
        ->patchJson('/api/v1/admin/settings', ['settings' => $settings])
        ->assertOk()
        ->assertJsonPath('data.call_lock_minutes', 30)
        ->assertJsonPath('data.voip_provider', 'asterisk');
});
