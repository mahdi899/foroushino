<?php

beforeEach(fn () => seedRoles());

it('issues and verifies a demo otp for each role account', function () {
    config(['demo_auth.enabled' => true]);

    foreach (config('demo_auth.accounts') as $phone => $account) {
        $response = $this->postJson('/api/v1/auth/phone-otp/request', ['phone' => $phone]);
        $response->assertOk()->assertJsonPath('data.channel', 'demo');

        $verify = $this->postJson('/api/v1/auth/phone-otp/verify', [
            'phone' => $phone,
            'code' => $account['otp'],
        ]);
        $verify->assertOk();
        expect($verify->json('data.user.roles'))->toContain($account['role']);
    }
});

it('verifies a demo otp without a prior request', function () {
    config(['demo_auth.enabled' => true]);

    $verify = $this->postJson('/api/v1/auth/phone-otp/verify', [
        'phone' => '09125555555',
        'code' => '55555',
    ]);

    $verify->assertOk();
    expect($verify->json('data.user.roles'))->toContain('admin');
});

it('lists demo accounts when demo mode is enabled', function () {
    config(['demo_auth.enabled' => true]);

    $response = $this->getJson('/api/v1/auth/demo-accounts');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(5);
    expect(collect($response->json('data'))->pluck('role'))->toContain('admin');
});

it('hides demo accounts when demo mode is disabled', function () {
    config(['demo_auth.enabled' => false]);

    $this->getJson('/api/v1/auth/demo-accounts')->assertNotFound();
});
