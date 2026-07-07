<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReferralCode;
use App\Models\ReferralConversion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReferralAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ReferralConversion::query()->with(['referrer', 'buyer', 'order'])->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $conversions = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $conversions->getCollection()->map(fn (ReferralConversion $c) => $this->payload($c)),
            'meta' => ['current_page' => $conversions->currentPage(), 'last_page' => $conversions->lastPage(), 'total' => $conversions->total()],
        ]);
    }

    public function codes(Request $request): JsonResponse
    {
        $codes = ReferralCode::query()->with('user')->withCount('clicks')->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $codes->getCollection()->map(fn (ReferralCode $c) => [
                'id' => $c->id,
                'code' => $c->code,
                'user_name' => $c->user?->name,
                'user_mobile' => $c->user?->mobile,
                'is_active' => $c->is_active,
                'clicks_count' => $c->clicks_count,
            ]),
            'meta' => ['current_page' => $codes->currentPage(), 'last_page' => $codes->lastPage(), 'total' => $codes->total()],
        ]);
    }

    public function update(Request $request, ReferralConversion $referral): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:pending,approved,rejected'],
        ]);

        $referral->update(['status' => $data['status']]);

        Log::channel('payment')->info('Referral conversion status changed by admin.', [
            'referral_conversion_id' => $referral->id,
            'admin_id' => $request->user()->id,
            'new_status' => $data['status'],
        ]);

        $referral->load(['referrer', 'buyer', 'order']);

        return response()->json(['data' => $this->payload($referral)]);
    }

    /** @return array<string, mixed> */
    private function payload(ReferralConversion $c): array
    {
        return [
            'id' => $c->id,
            'referrer_name' => $c->referrer?->name,
            'referrer_mobile' => $c->referrer?->mobile,
            'buyer_name' => $c->buyer?->name,
            'order_number' => $c->order?->order_number,
            'status' => $c->status->value,
            'cashback_amount' => $c->cashback_amount,
            'converted_at' => $c->converted_at?->toIso8601String(),
        ];
    }
}
