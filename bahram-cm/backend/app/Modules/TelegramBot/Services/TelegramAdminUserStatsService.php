<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\CourseAccessStatus;
use App\Enums\ReferralConversionStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReferralCode;
use App\Models\ReferralConversion;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Support\JalaliDate;
use App\Services\ReferralService;
use Carbon\Carbon;

class TelegramAdminUserStatsService
{
    public function __construct(
        private readonly ReferralService $referrals,
    ) {}

    /**
     * @return array{
     *   telegram_user_id: int,
     *   display_name: string,
     *   phone_display: string,
     *   registered_at: string,
     *   successful_orders: int,
     *   active_subscriptions: int,
     *   account_balance: int,
     *   cooperation_percent: int,
     *   subset_count: int,
     *   buyer_subset_count: int,
     *   subset_tx_count: int,
     *   subset_tx_amount: int
     * }
     */
    public function forAccount(TelegramAccount $account): array
    {
        $account->loadMissing('user');
        $user = $account->user;
        $name = $account->display_name
            ?: trim(($account->first_name ?? '').' '.($account->last_name ?? ''))
            ?: ($user?->name ?? '—');

        $registeredAt = $account->created_at ?? $account->mobile_verified_at;
        $registeredLabel = $registeredAt
            ? JalaliDate::format($registeredAt).' '.Carbon::parse($registeredAt)->timezone('Asia/Tehran')->format('H:i')
            : '—';

        $successfulOrders = 0;
        $activeSubscriptions = 0;
        $subsetCount = 0;
        $buyerSubsetCount = 0;
        $subsetTxCount = 0;
        $subsetTxAmount = 0;
        $accountBalance = 0;
        $cooperationPercent = $this->defaultCooperationPercent();

        if ($user instanceof User) {
            $successfulOrders = Order::query()
                ->where('user_id', $user->id)
                ->whereIn('status', ['paid', 'fulfilled'])
                ->count();

            $activeSubscriptions = CourseAccess::query()
                ->where('user_id', $user->id)
                ->where('status', CourseAccessStatus::Active)
                ->count();

            $referralStats = $this->referralNetworkStats($user, (int) $account->telegram_bot_id);
            $subsetCount = $referralStats['subset_count'];
            $buyerSubsetCount = $referralStats['buyer_subset_count'];
            $subsetTxCount = $referralStats['subset_tx_count'];
            $subsetTxAmount = $referralStats['subset_tx_amount'];
            $accountBalance = (int) ($this->referrals->summary($user)['payable_amount'] ?? 0);
        } else {
            $subsetCount = $this->botSubsetCount((int) $account->telegram_bot_id, null, null, (int) $account->telegram_user_id);
        }

        return [
            'telegram_user_id' => (int) $account->telegram_user_id,
            'display_name' => $name,
            'phone_display' => $this->formatPhone($account->mobile ?? $user?->mobile),
            'registered_at' => $registeredLabel,
            'successful_orders' => $successfulOrders,
            'active_subscriptions' => $activeSubscriptions,
            'account_balance' => $accountBalance,
            'cooperation_percent' => $cooperationPercent,
            'subset_count' => $subsetCount,
            'buyer_subset_count' => $buyerSubsetCount,
            'subset_tx_count' => $subsetTxCount,
            'subset_tx_amount' => $subsetTxAmount,
        ];
    }

    public function formatProfileText(TelegramAccount $account): string
    {
        $s = $this->forAccount($account);
        $amount = number_format($s['subset_tx_amount']);
        $balance = number_format($s['account_balance']);
        $name = \App\Modules\TelegramBot\Support\TelegramHtml::escape((string) $s['display_name']);
        $phone = \App\Modules\TelegramBot\Support\TelegramHtml::escape((string) $s['phone_display']);
        $registered = \App\Modules\TelegramBot\Support\TelegramHtml::escape((string) $s['registered_at']);
        $e = static fn (string $key): string => \App\Modules\TelegramBot\Support\TelegramCustomEmoji::tag($key);

        return $e('user').' <b>حساب کاربری شما</b>'."\n"
            ."──────────────\n"
            .$e('key')." شناسه: <code>{$s['telegram_user_id']}</code>\n"
            .$e('user')." نام: <b>{$name}</b>\n"
            .$e('phone')." موبایل: {$phone}\n"
            .$e('calendar')." ثبت‌نام: {$registered}\n\n"
            .$e('money')." تراکنش‌های موفق: <b>{$s['successful_orders']}</b>\n"
            .$e('graduation')." دوره‌های فعال: <b>{$s['active_subscriptions']}</b>\n"
            .$e('coin')." موجودی: <b>{$balance}</b> تومان\n\n"
            .$e('gift')." <b>همکاری در فروش</b>\n"
            .$e('trophy')." درصد: <b>{$s['cooperation_percent']}%</b>\n"
            .$e('family')." زیرمجموعه: <b>{$s['subset_count']}</b> نفر\n"
            .$e('briefcase')." خریدار: <b>{$s['buyer_subset_count']}</b> نفر\n"
            .$e('chart')." تراکنش زیرمجموعه: <b>{$s['subset_tx_count']}</b>\n"
            .$e('cash')." مبلغ زیرمجموعه: <b>{$amount}</b> تومان";
    }

    /**
     * Persist /start ref_CODE attribution onto the telegram account.
     */
    public function attributeReferralFromStartPayload(TelegramAccount $account, ?string $startPayload): void
    {
        $payload = trim((string) $startPayload);
        if ($payload === '' || ! preg_match('/^ref[_-]?(.+)$/iu', $payload, $matches)) {
            return;
        }

        $code = $this->referrals->resolveActiveCode((string) $matches[1]);
        if ($code === null) {
            return;
        }

        if ($account->user_id && (int) $account->user_id === (int) $code->user_id) {
            return;
        }

        $metadata = (array) ($account->metadata ?? []);
        $metadata['referred_by_code'] = $code->code;
        $metadata['referred_by_user_id'] = (int) $code->user_id;
        $account->update(['metadata' => $metadata]);
    }

    /** @return array{subset_count: int, buyer_subset_count: int, subset_tx_count: int, subset_tx_amount: int} */
    private function referralNetworkStats(User $user, int $telegramBotId): array
    {
        $code = $user->referralCode?->code
            ?? ReferralCode::query()->where('user_id', $user->id)->value('code');

        $subsetCount = $this->botSubsetCount($telegramBotId, (int) $user->id, is_string($code) ? $code : null);

        $buyerIds = collect();

        $conversionBuyers = ReferralConversion::query()
            ->where('referrer_user_id', $user->id)
            ->where('status', '!=', ReferralConversionStatus::Rejected)
            ->pluck('buyer_user_id');
        $buyerIds = $buyerIds->merge($conversionBuyers);

        $orderQuery = Order::query()->whereIn('status', ['paid', 'fulfilled']);
        if (is_string($code) && $code !== '') {
            $orderQuery->where('referral_code', $code);
        } else {
            $orderQuery->whereRaw('1 = 0');
        }

        $referredOrders = $orderQuery->get(['id', 'user_id', 'final_amount']);
        $buyerIds = $buyerIds->merge($referredOrders->pluck('user_id'))->filter()->unique()->values();

        return [
            'subset_count' => max($subsetCount, $buyerIds->count()),
            'buyer_subset_count' => $buyerIds->count(),
            'subset_tx_count' => $referredOrders->count(),
            'subset_tx_amount' => (int) $referredOrders->sum('final_amount'),
        ];
    }

    private function botSubsetCount(int $telegramBotId, ?int $referrerUserId, ?string $code, ?int $excludeTelegramUserId = null): int
    {
        $query = TelegramAccount::query()->where('telegram_bot_id', $telegramBotId);

        if ($excludeTelegramUserId) {
            $query->where('telegram_user_id', '!=', $excludeTelegramUserId);
        }

        $query->where(function ($q) use ($referrerUserId, $code): void {
            $has = false;
            if ($referrerUserId) {
                $q->where('metadata->referred_by_user_id', $referrerUserId);
                $has = true;
            }
            if (is_string($code) && $code !== '') {
                if ($has) {
                    $q->orWhere('metadata->referred_by_code', $code);
                } else {
                    $q->where('metadata->referred_by_code', $code);
                }
            }
            if (! $has && ($code === null || $code === '')) {
                $q->whereRaw('1 = 0');
            }
        });

        return $query->count();
    }

    private function defaultCooperationPercent(): int
    {
        $max = (int) Product::query()
            ->where('is_active', true)
            ->where('referral_cashback_enabled', true)
            ->where('referral_cashback_type', 'percent')
            ->max('referral_cashback_value');

        return max(0, $max);
    }

    private function formatPhone(?string $mobile): string
    {
        if (! filled($mobile)) {
            return '—';
        }

        $digits = preg_replace('/\D/u', '', $mobile) ?? '';
        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return '+'.$digits;
        }
        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            return '+98'.substr($digits, 1);
        }
        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '+98'.$digits;
        }

        return (string) $mobile;
    }
}
