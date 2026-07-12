<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreCashbackPayoutRequest;
use App\Models\CashbackPayout;
use App\Models\VerifiedBankAccount;
use App\Services\ReferralService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashbackPayoutController extends Controller
{
    public function __construct(private readonly ReferralService $referrals) {}

    public function index(Request $request): JsonResponse
    {
        $payouts = $request->user()->cashbackPayouts()->orderByDesc('id')->get();

        return ApiResponse::success($payouts->map(fn (CashbackPayout $payout) => [
            'id' => $payout->id,
            'amount' => $payout->amount,
            'masked_card_number' => $payout->masked_card_number,
            'status' => $payout->status->value,
            'paid_at' => $payout->paid_at?->toIso8601String(),
            'created_at' => $payout->created_at?->toIso8601String(),
        ]));
    }

    public function store(StoreCashbackPayoutRequest $request): JsonResponse
    {
        $user = $request->user();
        $identity = $user->identityProfile;
        $level = (int) ($identity?->verification_level ?? 1);

        if ($level < 2) {
            return ApiResponse::error(
                'identity_required',
                'برای برداشت، ابتدا باید حساب شما تأیید شود.',
                422,
            );
        }

        $bankAccount = VerifiedBankAccount::query()
            ->where('user_id', $user->id)
            ->whereKey($request->integer('verified_bank_account_id'))
            ->whereNotNull('verified_at')
            ->first();

        if (! $bankAccount) {
            return ApiResponse::error(
                'verified_bank_account_required',
                'برای برداشت، ابتدا باید یک کارت بانکی تأییدشده انتخاب کنید.',
                422,
            );
        }

        $summary = $this->referrals->summary($user);

        if ($summary['payable_amount'] <= 0) {
            return ApiResponse::error('nothing_payable', 'در حال حاضر مبلغی برای دریافت وجود ندارد.', 422);
        }

        $payout = new CashbackPayout([
            'user_id' => $user->id,
            'verified_bank_account_id' => $bankAccount->id,
            'amount' => $summary['payable_amount'],
            'card_holder_name' => $bankAccount->holder_name,
            'status' => 'pending',
        ]);

        if (filled($bankAccount->card_number_encrypted)) {
            $payout->setCardNumber($bankAccount->card_number_encrypted);
        }

        $payout->save();

        return ApiResponse::success([
            'id' => $payout->id,
            'amount' => $payout->amount,
            'masked_card_number' => $payout->masked_card_number,
            'status' => $payout->status->value,
        ], 201);
    }
}
