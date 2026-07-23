<?php

use App\Models\User;
use App\Support\BootstrapAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    BootstrapAdmin::seed();
});

it('returns cloudflare settings view for admin', function () {
    $admin = User::role('admin')->first();

    $this->actingAs($admin, 'sanctum')
        ->getJson('/api/v1/admin/cloudflare')
        ->assertOk()
        ->assertJsonPath('data.cloudflare_configured', false);
});

it('saves cloudflare zone id', function () {
    $admin = User::role('admin')->first();

    $this->actingAs($admin, 'sanctum')
        ->patchJson('/api/v1/admin/cloudflare', [
            'cloudflare_zone_id' => 'test-zone-123',
        ])
        ->assertOk()
        ->assertJsonPath('data.cloudflare_zone_id', 'test-zone-123');
});

it('denies cloudflare settings to non-admin', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/admin/cloudflare')
        ->assertForbidden();
});
