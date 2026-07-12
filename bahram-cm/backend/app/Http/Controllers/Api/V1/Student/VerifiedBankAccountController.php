<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Actions\Identity\VerifyBankAccount;
use App\Http\Controllers\Controller;
use App\Models\VerifiedBankAccount;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VerifiedBankAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accounts = $request->user()
            ->verifiedBankAccounts()
            ->whereNotNull('verified_at')
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($accounts->map(fn (VerifiedBankAccount $account) => $this->payload($account)));
    }

    public function rules(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'min_balance_for_verification' => (int) config('bahram.withdrawal.min_balance_for_verification', 100_000),
            'verification_fee' => (int) config('bahram.withdrawal.verification_fee', 7_000),
        ]);
    }

    public function store(Request $request, VerifyBankAccount $verify): JsonResponse
    {
        $data = $request->validate([
            'card_number' => ['nullable', 'digits:16', 'required_without:iban'],
            'iban' => ['nullable', 'string', 'min:24', 'max:34', 'required_without:card_number'],
            'holder_name' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $result = $verify(
                $request->user(),
                $data['card_number'] ?? null,
                $data['iban'] ?? null,
                $data['holder_name'] ?? null,
            );
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'احراز حساب بانکی ناموفق بود.';

            return ApiResponse::error('bank_verification_failed', $message, 422);
        }

        return ApiResponse::success($this->payload($result['account']), 201);
    }

    public function destroy(Request $request, VerifiedBankAccount $bankAccount): JsonResponse
    {
        if ($bankAccount->user_id !== $request->user()->id) {
            return ApiResponse::error('forbidden', 'دسترسی مجاز نیست.', 403);
        }

        $data = $request->validate([
            'confirmed' => ['accepted'],
        ], [
            'confirmed.accepted' => 'برای حذف کارت بانکی باید تأیید کنید.',
        ]);

        unset($data);

        $wasDefault = $bankAccount->is_default;
        $userId = $bankAccount->user_id;
        $bankAccount->delete();

        if ($wasDefault) {
            $next = VerifiedBankAccount::query()
                ->where('user_id', $userId)
                ->whereNotNull('verified_at')
                ->orderByDesc('id')
                ->first();

            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return ApiResponse::success(['deleted' => true]);
    }

    /** @return array<string, mixed> */
    private function payload(VerifiedBankAccount $account): array
    {
        return [
            'id' => $account->id,
            'masked_card_number' => $account->masked_card_number,
            'masked_iban' => $account->masked_iban,
            'bank_name' => $account->bank_name,
            'holder_name' => $account->holder_name,
            'is_default' => $account->is_default,
            'verified_at' => $account->verified_at?->toIso8601String(),
        ];
    }
}
