<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('authenticated user can upload profile avatar', function (): void {
    Storage::fake('public');

    $user = User::factory()->create(['avatar' => null]);

    $response = $this
        ->actingAs($user, 'sanctum')
        ->post('/api/v1/me/avatar', [
            'avatar' => UploadedFile::fake()->image('profile.jpg', 400, 400)->size(500),
        ]);

    $response
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'عکس پروفایل به‌روزرسانی شد');

    $avatarUrl = $response->json('data.avatar');
    expect($avatarUrl)->toBe('/storage/avatars/users/'.$user->id.'.jpg');

    $user->refresh();
    expect($user->avatar)->toBe($avatarUrl);
    Storage::disk('public')->assertExists('avatars/users/'.$user->id.'.jpg');
});

test('avatar upload rejects files larger than 2 megabytes', function (): void {
    Storage::fake('public');

    $user = User::factory()->create();

    $this
        ->actingAs($user, 'sanctum')
        ->post('/api/v1/me/avatar', [
            'avatar' => UploadedFile::fake()->image('large.jpg')->size(2049),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['avatar']);
});

test('avatar upload rejects unsupported file types', function (): void {
    Storage::fake('public');

    $user = User::factory()->create();

    $this
        ->actingAs($user, 'sanctum')
        ->post('/api/v1/me/avatar', [
            'avatar' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['avatar']);
});

test('authenticated user can remove profile avatar', function (): void {
    Storage::fake('public');

    $user = User::factory()->create();
    $path = 'avatars/users/'.$user->id.'.png';
    Storage::disk('public')->put($path, 'fake-image');
    $user->update(['avatar' => '/storage/'.$path]);

    $this
        ->actingAs($user, 'sanctum')
        ->deleteJson('/api/v1/me/avatar')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.avatar', null);

    $user->refresh();
    expect($user->avatar)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});
