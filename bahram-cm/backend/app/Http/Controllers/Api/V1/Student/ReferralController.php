<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\ReferralConversion;
use App\Services\ReferralService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function __construct(private readonly ReferralService $referrals) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $code = $this->referrals->getOrCreateCode($user);
        $summary = $this->referrals->summary($user);

        $invitees = ReferralConversion::query()
            ->where('referrer_user_id', $user->id)
            ->with('buyer')
            ->orderByDesc('id')
            ->get()
            ->map(fn (ReferralConversion $conversion) => [
                'buyer_name' => $conversion->buyer?->name,
                'status' => $conversion->status->value,
                'cashback_amount' => $conversion->cashback_amount,
                'converted_at' => $conversion->converted_at?->toIso8601String(),
            ]);

        $siteUrl = rtrim((string) config('app.frontend_url'), '/');

        return ApiResponse::success([
            'code' => $code->code,
            'link' => "{$siteUrl}/purchase/campaign-writing?ref={$code->code}",
            'is_active' => $code->is_active,
            'summary' => $summary,
            'invitees' => $invitees,
        ]);
    }
}
