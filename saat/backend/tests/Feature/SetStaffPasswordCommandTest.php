<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    seedRoles();
});

it('enables password login for an existing supervisor', function () {
    $supervisor = makeSupervisor([
        'phone' => '09104085688',
        'phone_otp_exempt' => false,
        'password' => Hash::make('old-random-secret'),
    ]);

    Artisan::call('saat:set-staff-password', [
        'phone' => '09104085688',
        '--password' => 'NewStaffPass99',
    ]);

    expect($supervisor->fresh()->phone_otp_exempt)->toBeTrue();

    $this->postJson('/api/v1/auth/phone-otp/request', [
        'phone' => '09104085688',
    ])->assertOk()
        ->assertJsonPath('data.channel', 'password');

    $this->postJson('/api/v1/auth/password-login', [
        'phone' => '09104085688',
        'password' => 'NewStaffPass99',
    ])->assertOk()
        ->assertJsonPath('data.user.id', $supervisor->id);
});

it('rejects unknown phone numbers', function () {
    $exit = Artisan::call('saat:set-staff-password', [
        'phone' => '09101112233',
        '--password' => 'NewStaffPass99',
    ]);

    expect($exit)->toBe(1);
});
