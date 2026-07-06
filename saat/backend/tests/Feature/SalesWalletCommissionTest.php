<?php

use App\Actions\Sales\ConfirmSaleAction;
use App\Actions\Sales\RejectSaleAction;
use App\Actions\Sales\SubmitPaymentAction;
use App\Enums\LeadStatus;
use App\Services\WalletService;

beforeEach(function () {
    seedRoles();
});

it('moves a sale to pending_confirmation once payment is submitted', function () {
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product);

    $sale = app(SubmitPaymentAction::class)->execute($sale, ['method' => 'gateway', 'reference_number' => 'REF1'], $agent);

    expect($sale->status->value)->toBe('pending_confirmation');
    expect($lead->fresh()->status)->toBe(LeadStatus::SalePendingConfirmation);
});

it('confirming a sale creates a pending commission and credits the wallet pending balance, not available', function () {
    $manager = makeManager();
    $agent = makeAgent();
    $product = makeProduct(['commission_rate' => 10]);
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');

    $commission = app(ConfirmSaleAction::class)->execute($sale, $manager);

    expect((float) $commission->commission_amount)->toBe(400000.0);
    expect($commission->status->value)->toBe('pending');
    expect($lead->fresh()->status)->toBe(LeadStatus::Won);

    $wallet = app(WalletService::class)->ensureWallet($agent)->fresh();
    expect((float) $wallet->balance_pending)->toBe(400000.0);
    expect((float) $wallet->balance_available)->toBe(0.0);
});

it('rejecting a sale sends the lead back to follow-up and never creates a commission', function () {
    $manager = makeManager();
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');

    $sale = app(RejectSaleAction::class)->execute($sale, $manager, 'مشتری انصراف داد');

    expect($sale->status->value)->toBe('rejected');
    expect($lead->fresh()->status)->toBe(LeadStatus::FollowUpRequired);
    expect(\App\Models\Commission::where('sale_id', $sale->id)->exists())->toBeFalse();
});

it('a pending commission does not add to the withdrawable available balance until explicitly released', function () {
    $manager = makeManager();
    $agent = makeAgent();
    $product = makeProduct(['commission_rate' => 10]);
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');
    $commission = app(ConfirmSaleAction::class)->execute($sale, $manager);

    $walletBefore = app(WalletService::class)->ensureWallet($agent)->fresh();
    expect((float) $walletBefore->balance_available)->toBe(0.0);

    app(WalletService::class)->releaseToAvailable($commission->fresh());

    $walletAfter = app(WalletService::class)->ensureWallet($agent)->fresh();
    expect((float) $walletAfter->balance_available)->toBe(400000.0);
    expect((float) $walletAfter->balance_pending)->toBe(0.0);
});

it('rejects a payout request larger than the available balance', function () {
    $agent = makeAgent();
    $wallet = app(WalletService::class)->ensureWallet($agent);
    $wallet->balance_available = 100_000;
    $wallet->save();

    expect(fn () => app(WalletService::class)->requestPayout($agent, 500_000))
        ->toThrow(RuntimeException::class);
});

it('allows a payout request within the available balance and locks the funds', function () {
    $agent = makeAgent();
    $wallet = app(WalletService::class)->ensureWallet($agent);
    $wallet->balance_available = 500_000;
    $wallet->save();

    $payout = app(WalletService::class)->requestPayout($agent, 300_000);

    expect($payout->status->value)->toBe('requested');

    $wallet = $wallet->fresh();
    expect((float) $wallet->balance_available)->toBe(200000.0);
    expect((float) $wallet->balance_locked)->toBe(300000.0);
});
