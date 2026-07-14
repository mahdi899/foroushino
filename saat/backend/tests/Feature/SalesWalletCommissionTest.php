<?php

use App\Actions\Sales\ConfirmSaleAction;
use App\Actions\Wallet\ApproveCommissionByLeaderAction;
use App\Actions\Wallet\ApproveCommissionBySupervisorAction;
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

    $sale = app(\App\Actions\Sales\SubmitPaymentAction::class)->execute($sale, ['method' => 'gateway', 'reference_number' => 'REF1'], $agent);

    expect($sale->status->value)->toBe('pending_confirmation');
    expect($lead->fresh()->status)->toBe(LeadStatus::SalePendingConfirmation);
});

it('confirming a sale creates a commission awaiting leader approval without wallet credit', function () {
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
    expect((float) $wallet->balance_pending)->toBe(0.0);
    expect((float) $wallet->balance_available)->toBe(0.0);
});

it('leader then supervisor approval credits the agent wallet', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $supervisor = makeSupervisor();
    $agent = makeAgent(['team_id' => $team->id]);
    $product = makeProduct(['commission_rate' => 10]);
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');
    $sale->update(['team_id' => $team->id]);

    $commission = app(ConfirmSaleAction::class)->execute($sale, $supervisor);
    app(ApproveCommissionByLeaderAction::class)->execute($commission->fresh(), $leader);
    app(ApproveCommissionBySupervisorAction::class)->execute($commission->fresh(), $supervisor);

    $wallet = app(WalletService::class)->ensureWallet($agent)->fresh();
    expect((float) $wallet->balance_available)->toBe(400000.0);
    expect($commission->fresh()->status->value)->toBe('available');
});

it('rejecting a sale sends the lead back to follow-up and never creates a commission', function () {
    $manager = makeManager();
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');

    $sale = app(\App\Actions\Sales\RejectSaleAction::class)->execute($sale, $manager, 'مشتری انصراف داد');

    expect($sale->status->value)->toBe('rejected');
    expect($lead->fresh()->status)->toBe(LeadStatus::FollowUpRequired);
    expect(\App\Models\Commission::where('sale_id', $sale->id)->exists())->toBeFalse();
});

it('rejects a payout request larger than the available balance', function () {
    $agent = makeAgent();
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
        'bank_card_confirmed_at' => now(),
    ])->save();
    $wallet = app(WalletService::class)->ensureWallet($agent);
    $wallet->balance_available = 100_000;
    $wallet->save();

    expect(fn () => app(WalletService::class)->requestPayout($agent, 500_000))
        ->toThrow(RuntimeException::class);
});

it('allows a payout request with confirmed bank card and locks the funds', function () {
    $agent = makeAgent();
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
        'bank_card_confirmed_at' => now(),
    ])->save();
    $wallet = app(WalletService::class)->ensureWallet($agent);
    $wallet->balance_available = 500_000;
    $wallet->save();

    $payout = app(WalletService::class)->requestPayout($agent, 300_000);

    expect($payout->status->value)->toBe('requested');
    expect($payout->bank_card)->toBe('6037991234567890');
    expect((float) $payout->bank_fee)->toBe(500.0);
    expect((float) $payout->net_amount)->toBe(299500.0);

    $wallet = $wallet->fresh();
    expect((float) $wallet->balance_available)->toBe(200000.0);
    expect((float) $wallet->balance_locked)->toBe(300000.0);
});

it('rejects payout when bank card is not supervisor-confirmed', function () {
    $agent = makeAgent();
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
    ])->save();
    $wallet = app(WalletService::class)->ensureWallet($agent);
    $wallet->balance_available = 500_000;
    $wallet->save();

    expect(fn () => app(WalletService::class)->requestPayout($agent, 300_000))
        ->toThrow(RuntimeException::class, 'شماره کارت هنوز توسط ناظر تایید نشده است.');
});

it('rejects payout amounts below the minimum or not aligned to step', function () {
    $agent = makeAgent();
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
        'bank_card_confirmed_at' => now(),
    ])->save();
    $wallet = app(WalletService::class)->ensureWallet($agent);
    $wallet->balance_available = 500_000;
    $wallet->save();

    expect(fn () => app(WalletService::class)->requestPayout($agent, 50_000))
        ->toThrow(RuntimeException::class);

    expect(fn () => app(WalletService::class)->requestPayout($agent, 100_500))
        ->toThrow(RuntimeException::class);
});

it('allows a full-balance payout even when the available balance is not aligned to step', function () {
    $agent = makeAgent();
    $agent->forceFill([
        'bank_card' => '6037991234567890',
        'bank_sheba' => '603799123456789012345678',
        'bank_card_confirmed_at' => now(),
    ])->save();
    $wallet = app(WalletService::class)->ensureWallet($agent);
    $wallet->balance_available = 456_789;
    $wallet->save();

    $payout = app(WalletService::class)->requestPayout($agent, 456_789);

    expect($payout->status->value)->toBe('requested');
    expect((float) $payout->amount)->toBe(456789.0);

    $wallet = $wallet->fresh();
    expect((float) $wallet->balance_available)->toBe(0.0);
    expect((float) $wallet->balance_locked)->toBe(456789.0);
});
