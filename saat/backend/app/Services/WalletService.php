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

        DB::transaction(function () use ($wallet, $diff, $user): void {
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

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();
        });

        return $wallet->fresh();
    }

    public function creditAvailable(Commission $commission): void
    {
        if ($commission->status !== CommissionStatus::Approved) {
            throw new RuntimeException('این پورسانت هنوز توسط لیدر تایید نشده است.');
        }

        DB::transaction(function () use ($commission): void {
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

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();
        });
    }

    /** @deprecated Legacy auto-release path — prefer leader/supervisor approval flow. */
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
        if ($commission->status === CommissionStatus::Approved) {
            $this->creditAvailable($commission);

            return;
        }

        if ($commission->status !== CommissionStatus::Pending) {
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

        return DB::transaction(function () use ($user, $amount, $normalizedCard, $normalizedSheba) {
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

            broadcast(new WalletUpdated($wallet->fresh()))->toOthers();

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
