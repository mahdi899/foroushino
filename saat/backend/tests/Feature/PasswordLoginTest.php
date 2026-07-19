<?php

use App\Models\User;
use App\Support\PhoneNormalizer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedRoles();
});

it('offers both login methods when password and telegram are available', function () {
    config(['saat.password_login_phones' => ['09367018089']]);

    $user = User::factory()->create([
        'phone' => '09367018089',
        'phone_otp_exempt' => false,
        'telegram_id' => 12345,
    ]);

    $response = $this->postJson('/api/v1/auth/phone-otp/request', [
        'phone' => $user->phone,
    ]);

    $response->assertOk()
        ->assertJsonPath('data.channel', 'choice')
        ->assertJsonPath('data.password_available', true)
        ->assertJsonPath('data.otp_available', true);
});

it('lets a user with both methods sign in with otp after choosing otp', function () {
    config(['telegram.bot_token' => 'test-bot-token']);
    Illuminate\Support\Facades\Http::fake([
        'api.telegram.org/*' => Illuminate\Support\Facades\Http::response(['ok' => true], 200),
    ]);

    $user = makeAgent([
        'phone' => '09121112233',
        'password' => Hash::make('SecurePass1234'),
        'phone_otp_exempt' => true,
        'telegram_id' => 556677,
    ]);

    $this->postJson('/api/v1/auth/phone-otp/request', [
        'phone' => $user->phone,
        'method' => 'otp',
    ])->assertOk()
        ->assertJsonPath('data.channel', 'telegram');

    Cache::put('saat:otp:phone:09121112233', '54321', 300);

    $this->postJson('/api/v1/auth/phone-otp/verify', [
        'phone' => $user->phone,
        'code' => '54321',
    ])->assertOk()
        ->assertJsonPath('data.user.id', $user->id);
});

it('returns the password channel when otp method is not requested explicitly', function () {
    config(['saat.password_login_phones' => ['09367018089']]);

    User::factory()->create([
        'phone' => '09367018089',
        'phone_otp_exempt' => false,
        'telegram_id' => 12345,
    ]);

    $this->postJson('/api/v1/auth/phone-otp/request', [
        'phone' => '09367018089',
        'method' => 'password',
    ])->assertOk()
        ->assertJsonPath('data.channel', 'password')
        ->assertJsonPath('data.password_available', true)
        ->assertJsonPath('data.otp_available', true);
});

it('lets a user with password login enabled sign in with password', function () {
    $user = makeAgent([
        'phone' => '09121112233',
        'password' => Hash::make('SecurePass1234'),
        'phone_otp_exempt' => true,
    ]);

    $response = $this->postJson('/api/v1/auth/password-login', [
        'phone' => $user->phone,
        'password' => 'SecurePass1234',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.user.id', $user->id);
});

it('lets any authenticated user set a password from settings', function () {
    $agent = makeAgent([
        'phone' => '09124445566',
        'phone_otp_exempt' => false,
    ]);
    Sanctum::actingAs($agent);

    $response = $this->putJson('/api/v1/me/password', [
        'password' => 'NewSecurePass99',
        'password_confirmation' => 'NewSecurePass99',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.password_login_enabled', true);

    expect($agent->fresh()->phone_otp_exempt)->toBeTrue();

    $this->postJson('/api/v1/auth/password-login', [
        'phone' => $agent->phone,
        'password' => 'NewSecurePass99',
    ])->assertOk();
});

it('requires the current password when changing an existing login password', function () {
    $agent = makeAgent([
        'phone' => '09127778899',
        'password' => Hash::make('OldSecurePass12'),
        'phone_otp_exempt' => true,
    ]);
    Sanctum::actingAs($agent);

    $this->putJson('/api/v1/me/password', [
        'password' => 'NewSecurePass99',
        'password_confirmation' => 'NewSecurePass99',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password']);

    $this->putJson('/api/v1/me/password', [
        'current_password' => 'OldSecurePass12',
        'password' => 'NewSecurePass99',
        'password_confirmation' => 'NewSecurePass99',
    ])->assertOk();
});

it('lets a configured exempt phone set an initial password without the current one', function () {
    config(['saat.password_login_phones' => ['09367018089']]);

    $agent = makeAgent([
        'phone' => PhoneNormalizer::normalize('09367018089'),
        'phone_otp_exempt' => false,
    ]);
    Sanctum::actingAs($agent);

    $this->putJson('/api/v1/me/password', [
        'password' => 'NewSecurePass99',
        'password_confirmation' => 'NewSecurePass99',
    ])->assertOk();
});

it('includes password_login_enabled on the me endpoint', function () {
    $agent = makeAgent([
        'phone' => PhoneNormalizer::normalize('09367018089'),
        'phone_otp_exempt' => false,
    ]);
    config(['saat.password_login_phones' => ['09367018089']]);
    Sanctum::actingAs($agent);

    $this->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.password_login_enabled', true);
});
