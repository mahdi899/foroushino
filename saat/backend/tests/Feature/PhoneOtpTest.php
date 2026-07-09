<?php

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(fn () => seedRoles());

it('sends a phone otp through telegram when the phone is linked', function () {
    config(['telegram.bot_token' => 'test-bot-token', 'demo_auth.enabled' => false]);

    Http::fake([
        'api.telegram.org/*' => Http::response(['ok' => true], 200),
    ]);

    $agent = makeAgent([
        'phone' => '09123456789',
        'telegram_id' => 998877,
    ]);

    $response = $this->postJson('/api/v1/auth/phone-otp/request', [
        'phone' => '09123456789',
    ]);

    $response->assertOk()->assertJsonPath('success', true);
    expect(Cache::has('saat:otp:phone:09123456789'))->toBeTrue();
    expect($response->json('data.channel'))->toBe('telegram');
    Http::assertSent(fn ($request) => str_contains($request->url(), 'sendMessage'));
});

it('verifies a phone otp and returns an auth token', function () {
    config(['telegram.bot_token' => 'test-bot-token']);
    Cache::put('saat:otp:phone:09123456789', '54321', 300);

    $agent = makeAgent([
        'phone' => '09123456789',
        'telegram_id' => 998877,
    ]);

    $response = $this->postJson('/api/v1/auth/phone-otp/verify', [
        'phone' => '09123456789',
        'code' => '54321',
    ]);

    $response->assertOk()->assertJsonPath('success', true);
    expect($response->json('data.user.id'))->toBe($agent->id);
});

it('rejects phone otp requests when the phone is not linked to telegram', function () {
    config(['telegram.bot_token' => 'test-bot-token']);
    makeAgent(['phone' => '09120001111']);

    $response = $this->postJson('/api/v1/auth/phone-otp/request', [
        'phone' => '09120001111',
    ]);

    $response->assertStatus(422);
});
