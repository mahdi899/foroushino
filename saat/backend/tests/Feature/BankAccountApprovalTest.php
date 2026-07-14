<?php

use App\Services\WalletService;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    seedRoles();
});

it('lists pending bank accounts for supervisor', function () {
    $team = makeTeam();
    $supervisor = makeSupervisor(['team_id' => $team->id]);
    $agent = makeAgent(['team_id' => $team->id]);
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
        'bank_card_confirmed_at' => null,
    ])->save();

    Sanctum::actingAs($supervisor);

    $response = $this->getJson('/api/v1/wallet/bank-accounts/queue');

    $response->assertOk()
        ->assertJsonPath('data.0.user_id', $agent->id)
        ->assertJsonPath('data.0.bank_card', '6037 9912 3456 7890')
        ->assertJsonPath('data.0.bank_sheba', 'IR603799123456789012345678');
});

it('confirms agent bank account and card', function () {
    $team = makeTeam();
    $supervisor = makeSupervisor(['team_id' => $team->id]);
    $agent = makeAgent(['team_id' => $team->id]);
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
        'bank_card_confirmed_at' => null,
    ])->save();
    app(WalletService::class)->ensureWallet($agent);

    Sanctum::actingAs($supervisor);

    $response = $this->postJson("/api/v1/wallet/bank-accounts/{$agent->id}/confirm");

    $response->assertOk()
        ->assertJsonPath('data.bank_card_confirmed', true);

    expect($agent->fresh()->bank_card_confirmed_at)->not->toBeNull();
});

it('rejects confirming bank account from another team supervisor', function () {
    $team = makeTeam(['name' => 'تیم الف']);
    $otherTeam = makeTeam(['name' => 'تیم ب']);
    $supervisor = makeSupervisor(['team_id' => $team->id]);
    $agent = makeAgent(['team_id' => $otherTeam->id]);
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
    ])->save();

    Sanctum::actingAs($supervisor);

    $response = $this->postJson("/api/v1/wallet/bank-accounts/{$agent->id}/confirm");

    $response->assertStatus(403);
});

it('rejects confirming when sheba is missing', function () {
    $team = makeTeam();
    $supervisor = makeSupervisor(['team_id' => $team->id]);
    $agent = makeAgent(['team_id' => $team->id]);
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => null,
    ])->save();

    Sanctum::actingAs($supervisor);

    $this->postJson("/api/v1/wallet/bank-accounts/{$agent->id}/confirm")
        ->assertStatus(422);
});
