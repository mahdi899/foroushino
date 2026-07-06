<?php

namespace App\Http\Controllers\Api\V1\Wallet;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Wallet\ProcessPayoutRequest;
use App\Http\Requests\V1\Wallet\RequestPayoutRequest;
use App\Http\Resources\V1\CommissionResource;
use App\Http\Resources\V1\PayoutRequestResource;
use App\Http\Resources\V1\WalletResource;
use App\Http\Resources\V1\WalletTransactionResource;
use App\Models\Commission;
use App\Models\PayoutRequest;
use App\Services\WalletService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class WalletController extends Controller
{
    public function __construct(private readonly WalletService $wallet) {}

    public function show(Request $request): JsonResponse
    {
        $wallet = $this->wallet->ensureWallet($request->user());

        return ApiResponse::success(new WalletResource($wallet));
    }

    public function transactions(Request $request): JsonResponse
    {
        $transactions = $request->user()->walletTransactions()
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 30));

        return ApiResponse::paginated(WalletTransactionResource::collection($transactions));
    }

    public function commissions(Request $request): JsonResponse
    {
        $commissions = $request->user()->commissions()
            ->with(['product', 'lead'])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 30));

        return ApiResponse::paginated(CommissionResource::collection($commissions));
    }

    public function showCommission(Request $request, Commission $commission): JsonResponse
    {
        $this->authorize('view', $commission);

        $commission->load(['product', 'lead', 'sale']);

        return ApiResponse::success(new CommissionResource($commission));
    }

    public function payoutRequests(Request $request): JsonResponse
    {
        $payouts = $request->user()->payoutRequests()->orderByDesc('requested_at')->get();

        return ApiResponse::success(PayoutRequestResource::collection($payouts));
    }

    public function requestPayout(RequestPayoutRequest $request): JsonResponse
    {
        try {
            $payout = $this->wallet->requestPayout($request->user(), (float) $request->input('amount'));
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'payout_rejected');
        }

        return ApiResponse::success(new PayoutRequestResource($payout), 'درخواست تسویه ثبت شد');
    }

    public function payoutQueue(Request $request): JsonResponse
    {
        if (! $request->user()->can('wallet.manage-payouts')) {
            return ApiResponse::error('اجازه دسترسی ندارید.', status: 403, code: 'forbidden');
        }

        $payouts = PayoutRequest::query()
            ->where('status', 'requested')
            ->with('user')
            ->orderBy('requested_at')
            ->get();

        return ApiResponse::success(PayoutRequestResource::collection($payouts));
    }

    public function approvePayout(ProcessPayoutRequest $request, PayoutRequest $payoutRequest): JsonResponse
    {
        $payout = $this->wallet->approvePayout($payoutRequest, $request->user());

        return ApiResponse::success(new PayoutRequestResource($payout), 'تسویه پرداخت شد');
    }

    public function rejectPayout(ProcessPayoutRequest $request, PayoutRequest $payoutRequest): JsonResponse
    {
        $payout = $this->wallet->rejectPayout($payoutRequest, $request->user(), $request->string('reason')->toString());

        return ApiResponse::success(new PayoutRequestResource($payout), 'درخواست تسویه رد شد');
    }

    public function releaseCommission(Request $request, Commission $commission): JsonResponse
    {
        if (! $request->user()->can('wallet.manage-payouts')) {
            return ApiResponse::error('اجازه دسترسی ندارید.', status: 403, code: 'forbidden');
        }

        try {
            $this->wallet->releaseToAvailable($commission);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'commission_not_releasable');
        }

        return ApiResponse::success(new CommissionResource($commission->fresh()), 'پورسانت آزاد شد');
    }
}
