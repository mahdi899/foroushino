<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Actions\Sales\ConfirmSaleAction;
use App\Actions\Sales\ForwardSaleForConfirmationAction;
use App\Actions\Sales\RejectSaleAction;
use App\Actions\Sales\RevokeConfirmedSaleAction;
use App\Actions\Sales\SubmitPaymentAction;
use App\Enums\RoleName;
use App\Enums\SaleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Sales\RejectSaleRequest;
use App\Http\Requests\V1\Sales\SubmitPaymentRequest;
use App\Http\Resources\V1\CommissionResource;
use App\Http\Resources\V1\SaleResource;
use App\Http\Resources\V1\WalletResource;
use App\Models\Sale;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function __construct(
        private readonly SubmitPaymentAction $submitPayment,
        private readonly ForwardSaleForConfirmationAction $forwardSale,
        private readonly ConfirmSaleAction $confirmSale,
        private readonly RejectSaleAction $rejectSale,
        private readonly RevokeConfirmedSaleAction $revokeConfirmedSale,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Sale::query()->with(['lead', 'product', 'agent']);

        TeamScope::applySaleQueryScope($query, $user);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $sales = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 30));

        return ApiResponse::paginated(SaleResource::collection($sales));
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        $this->authorize('view', $sale);

        $sale->load(['lead', 'product', 'agent', 'payments', 'commission']);

        return ApiResponse::success(new SaleResource($sale));
    }

    public function pendingPayments(Request $request): JsonResponse
    {
        $sales = Sale::query()
            ->where('agent_id', $request->user()->id)
            ->where('status', 'payment_pending')
            ->with(['lead', 'product'])
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success(SaleResource::collection($sales));
    }

    public function pendingConfirmation(Request $request): JsonResponse
    {
        if (! $request->user()->can('sales.confirm')) {
            return ApiResponse::error('اجازه دسترسی ندارید.', status: 403, code: 'forbidden');
        }

        $user = $request->user();
        $query = Sale::query()->where('status', 'pending_confirmation')->with(['lead', 'product', 'agent']);

        if (! TeamScope::isOrgWide($user)) {
            $query->where('team_id', $user->team_id);
        }

        return ApiResponse::success(SaleResource::collection($query->orderBy('submitted_at')->get()));
    }

    public function submitPayment(SubmitPaymentRequest $request, Sale $sale): JsonResponse
    {
        $this->authorize('submitPayment', $sale);

        $sale = $this->submitPayment->execute($sale, $request->validated(), $request->user());

        return ApiResponse::success(new SaleResource($sale), 'پرداخت ثبت شد و منتظر بررسی لیدر است');
    }

    public function forwardForConfirmation(Request $request, Sale $sale): JsonResponse
    {
        $this->authorize('forwardForConfirmation', $sale);

        $sale = $this->forwardSale->execute($sale, $request->user());

        return ApiResponse::success(new SaleResource($sale), 'فروش برای تایید مدیریت ارسال شد');
    }

    public function confirm(Request $request, Sale $sale): JsonResponse
    {
        $this->authorize('confirm', $sale);

        $commission = $this->confirmSale->execute($sale, $request->user());

        return ApiResponse::success([
            'sale' => new SaleResource($sale->fresh(['lead', 'product'])),
            'commission' => new CommissionResource($commission),
        ], 'فروش تایید شد');
    }

    public function cancel(Request $request, Sale $sale): JsonResponse
    {
        $this->authorize('cancel', $sale);

        if (! in_array($sale->status, [SaleStatus::PaymentPending, SaleStatus::PaymentSubmitted], true)) {
            return ApiResponse::error('این فروش را نمی‌توان لغو کرد.', status: 422, code: 'sale_not_cancellable');
        }

        $sale->status = SaleStatus::Cancelled;
        $sale->save();

        return ApiResponse::success(new SaleResource($sale), 'فروش لغو شد');
    }

    public function reject(RejectSaleRequest $request, Sale $sale): JsonResponse
    {
        $this->authorize('confirm', $sale);

        $reason = $request->string('reason')->toString();

        if ($sale->status === SaleStatus::Confirmed) {
            try {
                $result = $this->revokeConfirmedSale->execute($sale, $request->user(), $reason);
            } catch (\RuntimeException $e) {
                return ApiResponse::error($e->getMessage(), status: 422, code: 'sale_not_revocable');
            }

            return ApiResponse::success([
                'sale' => new SaleResource($result['sale']),
                'commission' => $result['commission'] ? new CommissionResource($result['commission']) : null,
                'wallet' => $result['wallet'] ? new WalletResource($result['wallet']) : null,
            ], 'فروش رد شد و پورسانت برگشت خورد');
        }

        if ($sale->status !== SaleStatus::PendingConfirmation) {
            return ApiResponse::error('این فروش قابل رد نیست.', status: 422, code: 'sale_not_rejectable');
        }

        $sale = $this->rejectSale->execute($sale, $request->user(), $reason);

        return ApiResponse::success(['sale' => new SaleResource($sale)], 'فروش رد شد');
    }
}
