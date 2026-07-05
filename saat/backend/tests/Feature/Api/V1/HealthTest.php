<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('health endpoint returns service status', function (): void {
    $response = $this->getJson('/api/v1/health');

    $response
        ->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Saat backend is running',
            'data' => [
                'app' => 'Saat',
                'queue' => 'redis',
                'broadcast' => 'reverb',
            ],
        ])
        ->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'app',
                'database',
                'redis',
                'queue',
                'broadcast',
            ],
        ]);
});

test('me endpoint requires sanctum authentication', function (): void {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('me endpoint returns authenticated user profile', function (): void {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user, 'sanctum')
        ->getJson('/api/v1/me');

    $response
        ->assertOk()
        ->assertJson([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
});
