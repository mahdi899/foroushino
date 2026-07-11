<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreCashbackPayoutRequest;
use App\Models\CashbackPayout;
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

        if ($level < 3) {
            $ownership = $identity?->mobile_ownership_status?->value;
            if ($ownership === 'locked') {
                return ApiResponse::error(
                    'ownership_locked',
                    'تطبیق شماره موبایل قفل شده است. با پشتیبانی تماس بگیرید.',
                    422,
                );
            }

            return ApiResponse::error(
                'ownership_required',
                'برای برداشت، تطبیق شماره موبایل با کد ملی الزامی است.',
                422,
            );
        }

        $summary = $this->referrals->summary($user);

        if ($summary['payable_amount'] <= 0) {
            return ApiResponse::error('nothing_payable', 'در حال حاضر مبلغی برای دریافت وجود ندارد.', 422);
        }

        $payout = new CashbackPayout([
            'user_id' => $user->id,
            'amount' => $summary['payable_amount'],
            'card_holder_name' => $request->input('card_holder_name'),
            'status' => 'pending',
        ]);
        $payout->setCardNumber($request->string('card_number'));
        $payout->save();

        return ApiResponse::success([
            'id' => $payout->id,
            'amount' => $payout->amount,
            'masked_card_number' => $payout->masked_card_number,
            'status' => $payout->status->value,
        ], 201);
    }
}
