<?php

use App\Models\AppSetting;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    seedRoles();
});

it('masks melipayamak password in admin settings response', function () {
    $manager = makeManager();

    AppSetting::syncMany([
        'melipayamak_username' => 'panel-user',
        'melipayamak_password' => 'panel-pass',
    ]);

    $this->actingAs($manager, 'sanctum')
        ->getJson('/api/v1/admin/settings')
        ->assertOk()
        ->assertJsonPath('data.melipayamak_username', 'panel-user')
        ->assertJsonMissingPath('data.melipayamak_password')
        ->assertJsonPath('data.melipayamak_password_configured', true);
});

it('keeps stored melipayamak password when patch omits it', function () {
    $manager = makeManager();

    AppSetting::syncMany([
        'melipayamak_username' => 'panel-user',
        'melipayamak_password' => 'panel-pass',
    ]);

    $this->actingAs($manager, 'sanctum')
        ->patchJson('/api/v1/admin/settings', [
            'settings' => [
                'melipayamak_username' => 'panel-user-2',
            ],
        ])
        ->assertOk()
        ->assertJsonPath('data.melipayamak_username', 'panel-user-2')
        ->assertJsonPath('data.melipayamak_password_configured', true);

    expect(AppSetting::string('melipayamak_password'))->toBe('panel-pass');
});

it('tests melipayamak connection from admin settings', function () {
    $manager = makeManager();

    Http::fake([
        'rest.payamak-panel.com/*' => Http::response(['Value' => 12500]),
    ]);

    $this->actingAs($manager, 'sanctum')
        ->postJson('/api/v1/admin/settings/test-melipayamak', [
            'username' => 'panel-user',
            'password' => 'panel-pass',
        ])
        ->assertOk()
        ->assertJsonPath('data.ok', true)
        ->assertJsonPath('data.credit', 12500);
});
