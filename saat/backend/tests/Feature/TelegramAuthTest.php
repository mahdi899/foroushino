<?php

use App\Models\User;
use App\Services\Auth\TelegramAuthVerifier;

beforeEach(fn () => seedRoles());

it('accepts a valid Telegram Login Widget payload', function () {
    config(['telegram.bot_token' => 'test-bot-token']);

    $authDate = time();
    $payload = [
        'id' => 424242,
        'first_name' => 'Ali',
        'last_name' => 'Test',
        'username' => 'ali_test',
        'auth_date' => $authDate,
    ];

    $pairs = collect($payload)->sortKeys();
    $dataCheckString = $pairs->map(fn ($value, $key) => "{$key}={$value}")->implode("\n");
    $secretKey = hash('sha256', 'test-bot-token', true);
    $payload['hash'] = hash_hmac('sha256', $dataCheckString, $secretKey);

    $response = $this->postJson('/api/v1/auth/telegram-widget', $payload);

    $response->assertOk()->assertJsonPath('success', true);
    expect(User::query()->where('telegram_id', 424242)->exists())->toBeTrue();
});

it('rejects an invalid Telegram Login Widget hash', function () {
    config(['telegram.bot_token' => 'test-bot-token']);

    $response = $this->postJson('/api/v1/auth/telegram-widget', [
        'id' => 1,
        'first_name' => 'Bad',
        'auth_date' => time(),
        'hash' => 'invalid',
    ]);

    $response->assertUnauthorized();
});

it('verifies widget payloads with the official secret derivation', function () {
    config(['telegram.bot_token' => 'test-bot-token']);

    $payload = [
        'id' => 99,
        'first_name' => 'Sara',
        'auth_date' => time(),
    ];

    $pairs = collect($payload)->sortKeys();
    $dataCheckString = $pairs->map(fn ($value, $key) => "{$key}={$value}")->implode("\n");
    $payload['hash'] = hash_hmac('sha256', $dataCheckString, hash('sha256', 'test-bot-token', true));

    $user = app(TelegramAuthVerifier::class)->verifyWidget($payload);

    expect($user['id'])->toBe(99);
    expect($user['first_name'])->toBe('Sara');
});
