<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\VerifiedBankAccount;
use App\Services\AdminAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VerifiedBankAccountAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('finance.view'), 403);

        $status = $request->string('status')->toString() ?: 'pending';

        $query = VerifiedBankAccount::query()->with('user:id,name,mobile')->orderByDesc('id');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $accounts = $query->paginate((int) $request->input('per_page', 30));

        return response()->json([
            'data' => $accounts->getCollection()->map(fn (VerifiedBankAccount $a) => $this->payload($a)),
            'meta' => [
                'current_page' => $accounts->currentPage(),
                'last_page' => $accounts->lastPage(),
                'total' => $accounts->total(),
            ],
        ]);
    }

    public function update(Request $request, VerifiedBankAccount $bankAccount, AdminAuditLogger $audit): JsonResponse
    {
        abort_unless($request->user()->hasPermission('finance.manage'), 403);

        $data = $request->validate([
            'status' => ['required', 'string', 'in:verified,rejected'],
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($bankAccount->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['این حساب قبلاً بررسی شده است.'],
            ]);
        }

        $bankAccount->update([
            'status' => $data['status'],
            'verified_at' => $data['status'] === 'verified' ? now() : null,
            'verification_fee' => $data['status'] === 'verified'
                ? (int) config('bahram.withdrawal.verification_fee', 7_000)
                : $bankAccount->verification_fee,
            'admin_reviewed_by' => $request->user()->id,
            'admin_reviewed_at' => now(),
            'admin_note' => $data['admin_note'] ?? null,
        ]);

        $audit->log($request->user(), 'verified_bank_account.'.$data['status'], $bankAccount, [
            'user_id' => $bankAccount->user_id,
        ]);

        return response()->json(['data' => $this->payload($bankAccount->fresh())]);
    }

    /** @return array<string, mixed> */
    private function payload(VerifiedBankAccount $a): array
    {
        return [
            'id' => $a->id,
            'user_id' => $a->user_id,
            'user_name' => $a->user?->name,
            'user_mobile' => $a->user?->mobile,
            'masked_card_number' => $a->masked_card_number,
            'masked_iban' => $a->masked_iban,
            'holder_name' => $a->holder_name,
            'bank_name' => $a->bank_name,
            'status' => $a->status,
            'admin_note' => $a->admin_note,
            'created_at' => $a->created_at?->toIso8601String(),
            'admin_reviewed_at' => $a->admin_reviewed_at?->toIso8601String(),
        ];
    }
}
