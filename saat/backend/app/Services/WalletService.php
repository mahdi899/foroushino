<?php

namespace App\Services;

use App\Enums\CommissionStatus;
use App\Enums\PayoutStatus;
use App\Enums\WalletTxType;
use App\Events\WalletUpdated;
use App\Models\Commission;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\PayoutRules;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WalletService
{
    public function ensureWallet(User $user): Wallet
    {
        return Wallet::query()->firstOrCreate(['user_id' => $user->id]);
    }

    public function creditPending(Commission $commission): void
    {
        DB::transaction(function () use ($commission): void {
            $wallet = $this->ensureWallet($commission->agent);
            $wallet->increment('balance_pending', $commission->commission_amount);

            WalletTransaction::query()->create([
                'user_id' => $commission->agent_id,
                'type' => WalletTxType::CommissionPending,
                'amount' => $commission->commission_amount,
                'description' => 'پورسانت فروش تاییدشده',
                'reference_type' => 'commission',
                'reference_id' => $commission->id,
            ]);

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();
        });
    }

    public function releaseToAvailable(Commission $commission): void
    {
        if ($commission->status !== CommissionStatus::Pending && $commission->status !== CommissionStatus::Approved) {
            throw new RuntimeException('این پورسانت قابل آزادسازی نیست.');
        }

        DB::transaction(function () use ($commission): void {
            $wallet = $this->ensureWallet($commission->agent);
            $wallet->balance_pending = max(0, $wallet->balance_pending - $commission->commission_amount);
            $wallet->balance_available += $commission->commission_amount;
            $wallet->total_earned += $commission->commission_amount;
            $wallet->save();

            $commission->status = CommissionStatus::Available;
            $commission->approved_at = $commission->approved_at ?? now();
            $commission->save();

            WalletTransaction::query()->create([
                'user_id' => $commission->agent_id,
                'type' => WalletTxType::CommissionAvailable,
                'amount' => $commission->commission_amount,
                'description' => 'پورسانت قابل برداشت شد',
                'reference_type' => 'commission',
                'reference_id' => $commission->id,
            ]);

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();
        });
    }

    public function requestPayout(User $user, float $amount): PayoutRequest
    {
        return DB::transaction(function () use ($user, $amount) {
            $wallet = $this->ensureWallet($user)->fresh();
            $wallet = Wallet::query()->whereKey($wallet->id)->lockForUpdate()->first();

            PayoutRules::assertValid($amount, (float) $wallet->balance_available);

            $bankFee = PayoutRules::calculateBankFee($amount);
            $netAmount = PayoutRules::netAmount($amount);

            $wallet->balance_available -= $amount;
            $wallet->balance_locked += $amount;
            $wallet->save();

            $payout = PayoutRequest::query()->create([
                'user_id' => $user->id,
                'amount' => $amount,
                'bank_fee' => $bankFee,
                'net_amount' => $netAmount,
                'status' => PayoutStatus::Requested,
                'requested_at' => now(),
            ]);

            $description = 'درخواست تسویه ثبت شد';
            if ($bankFee > 0) {
                $description .= ' — کارمزد بانکی '.number_format($bankFee).' تومان';
            }

            WalletTransaction::query()->create([
                'user_id' => $user->id,
                'type' => WalletTxType::PayoutRequested,
                'amount' => $amount,
                'description' => $description,
                'reference_type' => 'payout',
                'reference_id' => $payout->id,
            ]);

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();

            return $payout;
        });
    }

    public function approvePayout(PayoutRequest $payout, User $processedBy): PayoutRequest
    {
        return DB::transaction(function () use ($payout, $processedBy) {
            $wallet = $this->ensureWallet($payout->user);
            $wallet->balance_locked = max(0, $wallet->balance_locked - $payout->amount);
            $wallet->total_paid += $payout->amount;
            $wallet->save();

            $payout->status = PayoutStatus::Paid;
            $payout->processed_at = now();
            $payout->processed_by = $processedBy->id;
            $payout->save();

            WalletTransaction::query()->create([
                'user_id' => $payout->user_id,
                'type' => WalletTxType::PayoutPaid,
                'amount' => $payout->amount,
                'description' => 'تسویه پرداخت شد',
                'reference_type' => 'payout',
                'reference_id' => $payout->id,
            ]);

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();

            return $payout;
        });
    }

    public function rejectPayout(PayoutRequest $payout, User $processedBy, string $reason): PayoutRequest
    {
        return DB::transaction(function () use ($payout, $processedBy, $reason) {
            $wallet = $this->ensureWallet($payout->user);
            $wallet->balance_locked = max(0, $wallet->balance_locked - $payout->amount);
            $wallet->balance_available += $payout->amount;
            $wallet->save();

            $payout->status = PayoutStatus::Rejected;
            $payout->processed_at = now();
            $payout->processed_by = $processedBy->id;
            $payout->rejection_reason = $reason;
            $payout->save();

            WalletTransaction::query()->create([
                'user_id' => $payout->user_id,
                'type' => WalletTxType::PayoutRejected,
                'amount' => $payout->amount,
                'description' => 'درخواست تسویه رد شد',
                'reference_type' => 'payout',
                'reference_id' => $payout->id,
            ]);

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();

            return $payout;
        });
    }
}
