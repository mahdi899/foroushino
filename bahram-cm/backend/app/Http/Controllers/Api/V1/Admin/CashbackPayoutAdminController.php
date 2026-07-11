<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CashbackPayout;
use App\Services\AdminAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CashbackPayoutAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CashbackPayout::query()->with('user')->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $payouts = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $payouts->getCollection()->map(fn (CashbackPayout $p) => $this->payload($p)),
            'meta' => ['current_page' => $payouts->currentPage(), 'last_page' => $payouts->lastPage(), 'total' => $payouts->total()],
        ]);
    }

    /** Reveals the full card number for an authorized admin — every reveal is audited. */
    public function show(Request $request, CashbackPayout $payout, AdminAuditLogger $audit): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('finance.view_payout_card') || $request->user()->isSuperAdmin(),
            403
        );

        $audit->log($request->user(), 'cashback_payout.card_revealed', $payout, [
            'cashback_payout_id' => $payout->id,
        ]);

        Log::channel('payment')->warning('Cashback payout card number revealed by admin.', [
            'cashback_payout_id' => $payout->id,
            'admin_id' => $request->user()->id,
        ]);

        return response()->json(['data' => [
            ...$this->payload($payout),
            'card_number' => $payout->card_number_encrypted,
            'card_holder_name' => $payout->card_holder_name,
        ]]);
    }

    public function update(Request $request, CashbackPayout $payout): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:pending,approved,paid,rejected'],
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $payout->update([
            'status' => $data['status'],
            'admin_note' => $data['admin_note'] ?? $payout->admin_note,
            'paid_at' => $data['status'] === 'paid' ? now() : $payout->paid_at,
        ]);

        Log::channel('payment')->info('Cashback payout status changed by admin.', [
            'cashback_payout_id' => $payout->id,
            'admin_id' => $request->user()->id,
            'new_status' => $data['status'],
        ]);

        return response()->json(['data' => $this->payload($payout)]);
    }

    /** @return array<string, mixed> */
    private function payload(CashbackPayout $p): array
    {
        return [
            'id' => $p->id,
            'user_name' => $p->user?->name,
            'user_mobile' => $p->user?->mobile,
            'amount' => $p->amount,
            'masked_card_number' => $p->masked_card_number,
            'status' => $p->status->value,
            'admin_note' => $p->admin_note,
            'paid_at' => $p->paid_at?->toIso8601String(),
            'created_at' => $p->created_at?->toIso8601String(),
        ];
    }
}
