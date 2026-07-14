<?php

namespace App\Http\Controllers\Api\V1\Calls;

use App\Actions\Calls\SubmitCallResultAction;
use App\Enums\Availability;
use App\Enums\CallMethod;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Calls\ReconcileCallRequest;
use App\Http\Requests\V1\Calls\StartCallRequest;
use App\Http\Requests\V1\Calls\SubmitCallResultRequest;
use App\Http\Resources\V1\CallResource;
use App\Http\Resources\V1\FollowUpResource;
use App\Http\Resources\V1\LeadResource;
use App\Http\Resources\V1\SaleResource;
use App\Models\AppSetting;
use App\Models\Call;
use App\Models\Lead;
use App\Services\Shift\ShiftTimeTracker;
use App\Services\Telephony\CallOrchestrator;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
    public function __construct(
        private readonly SubmitCallResultAction $submitCallResult,
        private readonly ShiftTimeTracker $shiftTracker,
        private readonly CallOrchestrator $orchestrator,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Call::query()
            ->with(['lead'])
            ->where('agent_id', $request->user()->id)
            ->orderByDesc('created_at');

        if ($request->filled('lead_id')) {
            $query->where('lead_id', $request->integer('lead_id'));
        }

        return ApiResponse::success(CallResource::collection(
            $query->limit(min($request->integer('per_page', 100), 100))->get(),
        ));
    }

    public function start(StartCallRequest $request): JsonResponse
    {
        $lead = Lead::query()->findOrFail($request->integer('lead_id'));
        $this->authorize('view', $lead);

        $method = $request->filled('method')
            ? CallMethod::from($request->string('method')->toString())
            : null;

        $started = $this->orchestrator->start($request->user(), $lead, $method);
        $call = $started['call'];

        $lead->status = LeadStatus::InCall;
        $lead->locked_by = $request->user()->id;
        $lead->locked_until = now()->addMinutes(AppSetting::callLockMinutes());
        $lead->save();

        $this->shiftTracker->changeAvailability($request->user(), Availability::InCall);

        return ApiResponse::success([
            'call' => new CallResource($call),
            'lead' => new LeadResource($lead),
            'capabilities' => $started['capabilities'],
            'session' => $started['session'] ?? null,
        ], 'تماس شروع شد');
    }

    public function reconcile(ReconcileCallRequest $request, Call $call): JsonResponse
    {
        $this->authorize('view', $call->lead);
        abort_unless($call->agent_id === $request->user()->id, 403);

        $call = $this->orchestrator->reconcileNative($call, $request->string('outcome')->toString());

        return ApiResponse::success(new CallResource($call), 'وضعیت تماس ثبت شد');
    }

    public function submitResult(SubmitCallResultRequest $request, Call $call): JsonResponse
    {
        $this->authorize('view', $call->lead);

        $result = $this->submitCallResult->execute($call, $request->validated());

        $duration = (int) ($request->validated()['duration_sec'] ?? 0);
        $this->shiftTracker->addCallSeconds($request->user(), $duration);
        $this->shiftTracker->changeAvailability($request->user(), Availability::Available);

        return ApiResponse::success([
            'call' => new CallResource($result['call']),
            'lead' => new LeadResource($result['lead']),
            'follow_up' => $result['follow_up'] ? new FollowUpResource($result['follow_up']) : null,
            'sale' => $result['sale'] ? new SaleResource($result['sale']) : null,
            'next_action' => $result['next_action']->value,
        ], 'نتیجه تماس ثبت شد');
    }

    public function show(Request $request, Call $call): JsonResponse
    {
        $this->authorize('view', $call->lead);

        return ApiResponse::success(new CallResource($call->load('events')));
    }
}
