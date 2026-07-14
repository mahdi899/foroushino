<?php

namespace App\Http\Controllers\Api\V1\Wallet;

use App\Actions\Wallet\ApproveCommissionByLeaderAction;
use App\Actions\Wallet\ApproveCommissionBySupervisorAction;
use App\Actions\Wallet\ClearBankAccountAction;
use App\Actions\Wallet\ConfirmBankAccountAction;
use App\Actions\Wallet\RejectCommissionAction;
use App\Enums\CommissionStatus;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Wallet\ProcessPayoutRequest;
use App\Http\Requests\V1\Wallet\RequestPayoutRequest;
use App\Http\Requests\V1\Wallet\UpdateBankCardRequest;
use App\Http\Resources\V1\BankAccountReviewResource;
use App\Http\Resources\V1\CommissionResource;
use App\Http\Resources\V1\PayoutRequestResource;
use App\Http\Resources\V1\UserAdminResource;
use App\Http\Resources\V1\WalletResource;
use App\Http\Resources\V1\WalletTransactionResource;
use App\Models\Commission;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Services\WalletService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class WalletController extends Controller
{
    public function __construct(
        private readonly WalletService $wallet,
        private readonly ApproveCommissionByLeaderAction $approveByLeader,
        private readonly ApproveCommissionBySupervisorAction $approveBySupervisor,
        private readonly RejectCommissionAction $rejectCommission,
        private readonly ConfirmBankAccountAction $confirmBankAccount,
        private readonly ClearBankAccountAction $clearBankAccount,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $wallet = $this->wallet->reconcileAvailableBalance($request->user());
        $user = $request->user();

        return ApiResponse::success(array_merge(
            (new WalletResource($wallet))->resolve($request),
            [
                'bank_card_masked' => $user->bank_card
                    ? WalletService::maskBankCard($user->bank_card)
                    : null,
                'bank_card_confirmed' => $user->bank_card_confirmed_at !== null,
                'bank_sheba_registered' => filled($user->bank_sheba),
            ],
        ));
    }

    public function updateBankCard(UpdateBankCardRequest $request): JsonResponse
    {
        $user = $request->user();
        $card = WalletService::normalizeBankCard($request->string('bank_card')->toString());
        $sheba = WalletService::normalizeSheba($request->string('bank_sheba')->toString());
        $user->bank_card = $card;
        $user->bank_sheba = $sheba;
        $user->bank_card_confirmed_at = null;
        $user->save();

        $this->wallet->notifyBankAccountSubmitted($user);

        return ApiResponse::success([
            'bank_card_masked' => WalletService::maskBankCard($card),
            'bank_card_confirmed' => false,
            'bank_sheba_registered' => true,
        ], 'اطلاعات بانکی ثبت شد و منتظر تایید ناظر است');
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

    public function commissionQueue(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Commission::query()
            ->with(['product', 'lead', 'agent'])
            ->orderByDesc('created_at');

        if ($user->hasRole(RoleName::Leader->value)) {
            abort_unless($user->can('commissions.approve-leader'), 403);
            $query
                ->where('status', CommissionStatus::Pending)
                ->whereHas('agent', fn ($q) => $q->where('team_id', $user->team_id));
        } elseif ($user->hasAnyRole([RoleName::Supervisor->value, RoleName::Manager->value, RoleName::Admin->value])) {
            abort_unless($user->can('commissions.approve-supervisor'), 403);
            $query->where('status', CommissionStatus::Approved);
        } else {
            abort(403, 'اجازه دسترسی ندارید.');
        }

        return ApiResponse::paginated(
            CommissionResource::collection($query->paginate($request->integer('per_page', 50))),
        );
    }

    public function showCommission(Request $request, Commission $commission): JsonResponse
    {
        $this->authorize('view', $commission);

        $commission->load(['product', 'lead', 'sale', 'agent']);

        return ApiResponse::success(new CommissionResource($commission));
    }

    public function approveCommissionLeader(Request $request, Commission $commission): JsonResponse
    {
        $this->authorize('approveAsLeader', $commission);

        try {
            $updated = $this->approveByLeader->execute($commission, $request->user());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'commission_not_approvable');
        }

        return ApiResponse::success(new CommissionResource($updated), 'پورسانت توسط لیدر تایید شد');
    }

    public function approveCommissionSupervisor(Request $request, Commission $commission): JsonResponse
    {
        $this->authorize('approveAsSupervisor', $commission);

        try {
            $updated = $this->approveBySupervisor->execute($commission, $request->user());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'commission_not_approvable');
        }

        return ApiResponse::success(new CommissionResource($updated), 'پورسانت به کیف پول کارشناس اضافه شد');
    }

    public function rejectCommission(Request $request, Commission $commission): JsonResponse
    {
        $this->authorize('reject', $commission);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $updated = $this->rejectCommission->execute($commission, $request->user(), $validated['reason']);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'commission_not_rejectable');
        }

        return ApiResponse::success(new CommissionResource($updated), 'پورسانت رد شد');
    }

    public function payoutRequests(Request $request): JsonResponse
    {
        $payouts = $request->user()->payoutRequests()->orderByDesc('requested_at')->get();

        return ApiResponse::success(PayoutRequestResource::collection($payouts));
    }

    public function requestPayout(RequestPayoutRequest $request): JsonResponse
    {
        try {
            $payout = $this->wallet->requestPayout(
                $request->user(),
                (float) $request->input('amount'),
            );
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

    public function bankAccountQueue(Request $request): JsonResponse
    {
        $supervisor = $request->user();
        abort_unless(
            $supervisor->can('users.manage-team') || $supervisor->can('users.manage'),
            403,
            'اجازه دسترسی ندارید.',
        );

        $query = User::query()
            ->role(RoleName::Agent->value)
            ->whereNotNull('bank_card')
            ->whereNotNull('bank_sheba')
            ->whereNull('bank_card_confirmed_at')
            ->with('team')
            ->orderByDesc('updated_at');

        if (! $supervisor->can('users.manage') && ! $supervisor->can('reports.view-all') && $supervisor->team_id) {
            $query->where('team_id', $supervisor->team_id);
        }

        return ApiResponse::success(BankAccountReviewResource::collection($query->get()));
    }

    public function confirmBankAccount(Request $request, User $user): JsonResponse
    {
        try {
            $agent = $this->confirmBankAccount->execute($user, $request->user());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'bank_account_not_confirmable');
        }

        return ApiResponse::success(new UserAdminResource($agent), 'اطلاعات بانکی کارشناس تایید شد');
    }

    public function clearBankAccount(Request $request, User $user): JsonResponse
    {
        try {
            $agent = $this->clearBankAccount->execute($user, $request->user());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'bank_account_not_clearable');
        }

        return ApiResponse::success(new UserAdminResource($agent), 'اطلاعات بانکی کارشناس حذف شد');
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
