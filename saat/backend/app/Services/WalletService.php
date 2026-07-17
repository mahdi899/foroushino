<?php

namespace App\Services;

use App\Enums\CommissionStatus;
use App\Enums\NotificationKind;
use App\Enums\PayoutStatus;
use App\Enums\RoleName;
use App\Enums\WalletTxType;
use App\Events\WalletUpdated;
use App\Models\Commission;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\PayoutRules;
use App\Support\SafeBroadcast;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WalletService
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function ensureWallet(User $user): Wallet
    {
        return Wallet::query()->firstOrCreate(['user_id' => $user->id]);
    }

    /** Align wallet balance with available commissions when credit was missed. */
    public function reconcileAvailableBalance(User $user): Wallet
    {
        $wallet = $this->ensureWallet($user)->fresh();

        $availableSum = (float) Commission::query()
            ->where('agent_id', $user->id)
            ->where('status', CommissionStatus::Available)
            ->sum('commission_amount');

        $currentAvailable = (float) $wallet->balance_available;
        $locked = (float) $wallet->balance_locked;
        $expectedAvailable = max(0, $availableSum - $locked);

        if ($expectedAvailable <= $currentAvailable + 0.01) {
            return $wallet;
        }

        $diff = $expectedAvailable - $currentAvailable;

        $wallet = DB::transaction(function () use ($wallet, $diff, $user): Wallet {
            $wallet->balance_available += $diff;
            $wallet->total_earned += $diff;
            $wallet->save();

            WalletTransaction::query()->create([
                'user_id' => $user->id,
                'type' => WalletTxType::CommissionAvailable,
                'amount' => $diff,
                'description' => 'همگام‌سازی موجودی پورسانت',
                'reference_type' => 'wallet_reconcile',
                'reference_id' => null,
            ]);

            return $wallet->fresh();
        });

        $this->broadcastWalletUpdated($wallet);

        return $wallet;
    }

    public function creditAvailable(Commission $commission): void
    {
        if ($commission->status !== CommissionStatus::Approved) {
            throw new RuntimeException('این پورسانت هنوز توسط لیدر تایید نشده است.');
        }

        $wallet = DB::transaction(function () use ($commission): Wallet {
            $wallet = $this->ensureWallet($commission->agent);
            $wallet->balance_available += $commission->commission_amount;
            $wallet->total_earned += $commission->commission_amount;
            $wallet->save();

            $commission->status = CommissionStatus::Available;
            $commission->available_at = now();
            $commission->save();

            WalletTransaction::query()->create([
                'user_id' => $commission->agent_id,
                'type' => WalletTxType::CommissionAvailable,
                'amount' => $commission->commission_amount,
                'description' => 'پورسانت به کیف پول اضافه شد',
                'reference_type' => 'commission',
                'reference_id' => $commission->id,
            ]);

            return $wallet->fresh();
        });

        $this->broadcastWalletUpdated($wallet);
    }

    public function reverseCommission(Commission $commission, string $reason): Wallet
    {
        if (in_array($commission->status, [CommissionStatus::Reversed, CommissionStatus::Rejected], true)) {
            throw new RuntimeException('این پورسانت قبلاً برگشت خورده است.');
        }

        $wallet = DB::transaction(function () use ($commission, $reason): Wallet {
            $amount = (float) $commission->commission_amount;
            $wallet = $this->ensureWallet($commission->agent);

            if (in_array($commission->status, [CommissionStatus::Available, CommissionStatus::Paid], true)) {
                $wallet = Wallet::query()->whereKey($wallet->id)->lockForUpdate()->first();
                $wallet->balance_available -= $amount;
                $wallet->total_earned = max(0, (float) $wallet->total_earned - $amount);
                $wallet->save();

                WalletTransaction::query()->create([
                    'user_id' => $commission->agent_id,
                    'type' => WalletTxType::Reversal,
                    'amount' => $amount,
                    'description' => 'برگشت پورسانت — '.$reason,
                    'reference_type' => 'commission',
                    'reference_id' => $commission->id,
                ]);
            }

            $commission->status = CommissionStatus::Reversed;
            $commission->rejection_reason = $reason;
            $commission->save();

            return $wallet->fresh();
        });

        $this->broadcastWalletUpdated($wallet);

        return $wallet;
    }

    /** @deprecated Legacy auto-release path — prefer leader/supervisor approval flow. */
    public function creditPending(Commission $commission): void
    {
        $wallet = DB::transaction(function () use ($commission): Wallet {
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

            return $wallet->fresh();
        });

        $this->broadcastWalletUpdated($wallet);
    }

    /** @deprecated Use leader then supervisor approval — pending commissions cannot skip the queue. */
    public function releaseToAvailable(Commission $commission): void
    {
        if ($commission->status === CommissionStatus::Approved) {
            $this->creditAvailable($commission);

            return;
        }

        if ($commission->status === CommissionStatus::Pending) {
            throw new RuntimeException('این پورسانت هنوز توسط لیدر تیم تایید نشده است.');
        }

        throw new RuntimeException('این پورسانت قابل آزادسازی نیست.');
    }

    public function requestPayout(User $user, float $amount): PayoutRequest
    {
        if (! $user->bank_card) {
            throw new RuntimeException('ابتدا شماره کارت و شبا را در بخش درآمد من ثبت کن.');
        }

        if (! $user->bank_sheba) {
            throw new RuntimeException('ابتدا شماره شبا را در بخش درآمد من ثبت کن.');
        }

        if ($user->bank_card_confirmed_at === null) {
            throw new RuntimeException('شماره کارت هنوز توسط ناظر تایید نشده است.');
        }

        $normalizedCard = self::normalizeBankCard($user->bank_card);
        $normalizedSheba = self::normalizeSheba($user->bank_sheba);

        $payout = DB::transaction(function () use ($user, $amount, $normalizedCard, $normalizedSheba) {
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
                'bank_card' => $normalizedCard,
                'bank_sheba' => $normalizedSheba,
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

            User::query()
                ->role([RoleName::Supervisor->value, RoleName::Manager->value, RoleName::Admin->value])
                ->where('is_active', true)
                ->each(fn (User $supervisor) => $this->notifications->notify(
                    $supervisor,
                    NotificationKind::Payout,
                    'درخواست تسویه جدید',
                    "{$user->name} درخواست تسویه ".number_format($amount).' تومان ثبت کرد.',
                    '/wallet/payouts',
                ));

            return $payout;
        });

        $this->broadcastWalletUpdated($this->ensureWallet($user)->fresh());

        return $payout;
    }

    public static function normalizeBankCard(string $card): string
    {
        $digits = preg_replace('/\D/', '', $card) ?? '';
        if (strlen($digits) !== 16) {
            throw new RuntimeException('شماره کارت باید ۱۶ رقم باشد.');
        }

        return $digits;
    }

    public static function maskBankCard(string $card): string
    {
        $digits = preg_replace('/\D/', '', $card) ?? '';

        return strlen($digits) >= 4 ? '****'.substr($digits, -4) : '****';
    }

    /** Normalize Iranian SHEBA to 24 digits (without IR prefix). */
    public static function normalizeSheba(string $sheba): string
    {
        $raw = strtoupper(trim($sheba));
        $raw = str_starts_with($raw, 'IR') ? substr($raw, 2) : $raw;
        $digits = preg_replace('/\D/', '', $raw) ?? '';

        if (strlen($digits) !== 24) {
            throw new RuntimeException('شماره شبا باید ۲۴ رقم باشد (با یا بدون IR).');
        }

        return $digits;
    }

    public static function formatSheba(string $shebaDigits): string
    {
        $digits = preg_replace('/\D/', '', $shebaDigits) ?? '';

        return 'IR'.$digits;
    }

    public static function formatBankCard(string $card): string
    {
        $digits = preg_replace('/\D/', '', $card) ?? '';

        return trim(chunk_split($digits, 4, ' '));
    }

    public function notifyBankAccountSubmitted(User $agent): void
    {
        User::query()
            ->role([RoleName::Supervisor->value, RoleName::Manager->value, RoleName::Admin->value])
            ->where('is_active', true)
            ->each(fn (User $supervisor) => $this->notifications->notify(
                $supervisor,
                NotificationKind::Payout,
                'اطلاعات بانکی جدید',
                "{$agent->name} کارت و شبای خود را ثبت کرد و منتظر تایید است.",
                '/wallet/bank-accounts',
            ));
    }

    public function approvePayout(PayoutRequest $payout, User $processedBy): PayoutRequest
    {
        $payout = DB::transaction(function () use ($payout, $processedBy) {
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

            return $payout;
        });

        $this->broadcastWalletUpdated($this->ensureWallet($payout->user)->fresh());

        return $payout;
    }

    public function rejectPayout(PayoutRequest $payout, User $processedBy, string $reason): PayoutRequest
    {
        $payout = DB::transaction(function () use ($payout, $processedBy, $reason) {
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

            return $payout;
        });

        $this->broadcastWalletUpdated($this->ensureWallet($payout->user)->fresh());

        return $payout;
    }

    private function broadcastWalletUpdated(Wallet $wallet): void
    {
        SafeBroadcast::optionally(
            fn () => broadcast(new WalletUpdated($wallet))->toOthers(),
        );
    }
}
