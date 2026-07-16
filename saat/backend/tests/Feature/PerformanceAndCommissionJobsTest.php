<?php

use App\Enums\CommissionStatus;
use App\Models\Commission;
use App\Models\PerformanceSnapshot;

beforeEach(function () {
    seedRoles();
});

it('generates a daily performance snapshot from the agent\'s calls', function () {
    $agent = makeAgent();
    foreach (['interested', 'no_answer', 'not_interested'] as $result) {
        $lead = makeLead(['assigned_agent_id' => $agent->id]);
        \App\Models\Call::query()->create([
            'lead_id' => $lead->id,
            'agent_id' => $agent->id,
            'result' => $result,
            'duration_sec' => 60,
            'note' => 'یادداشت تست',
            'started_at' => now(),
            'ended_at' => now(),
        ]);
    }

    $this->artisan('performance:snapshot')->assertSuccessful();

    $snapshot = PerformanceSnapshot::where('user_id', $agent->id)->whereDate('date', today())->first();

    expect($snapshot)->not->toBeNull();
    expect($snapshot->calls_count)->toBe(3);
    expect($snapshot->successful_count)->toBe(1);
    expect((float) $snapshot->conversion_rate)->toBe(33.33);
    expect((float) $snapshot->note_quality)->toBe(100.0);
});

it('does not auto-release commissions awaiting leader approval', function () {
    $agent = makeAgent();
    $product = makeProduct();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = \App\Models\Sale::query()->create([
        'lead_id' => $lead->id,
        'agent_id' => $agent->id,
        'product_id' => $product->id,
        'amount' => 1_000_000,
        'status' => 'confirmed',
    ]);
    $commission = Commission::query()->create([
        'sale_id' => $sale->id,
        'agent_id' => $agent->id,
        'product_id' => $product->id,
        'lead_id' => $lead->id,
        'sale_amount' => 1_000_000,
        'commission_rate' => 10,
        'commission_amount' => 100_000,
        'status' => CommissionStatus::Pending,
        'available_at' => now()->subHour(),
    ]);

    $this->artisan('commissions:release-due')->assertSuccessful();

    expect($commission->fresh()->status)->toBe(CommissionStatus::Pending);
    $wallet = app(\App\Services\WalletService::class)->ensureWallet($agent)->fresh();
    expect((float) $wallet->balance_available)->toBe(0.0);
});

it('rejects supervisor final approval when leader has not approved yet', function () {
    $team = makeTeam();
    $leader = makeLeader(['team_id' => $team->id]);
    $team->update(['leader_id' => $leader->id]);
    $supervisor = makeSupervisor();
    $agent = makeAgent(['team_id' => $team->id]);
    $product = makeProduct(['commission_rate' => 10]);
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $sale = makeSaleFor($agent, $lead, $product, 'pending_confirmation');
    $sale->update(['team_id' => $team->id]);

    $commission = app(\App\Actions\Sales\ConfirmSaleAction::class)->execute($sale, $supervisor);

    expect($commission->status->value)->toBe('pending');

    expect(fn () => app(\App\Actions\Wallet\ApproveCommissionBySupervisorAction::class)
        ->execute($commission->fresh(), $supervisor))
        ->toThrow(RuntimeException::class, 'این پورسانت هنوز توسط لیدر تایید نشده است.');
});
