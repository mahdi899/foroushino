<?php

namespace App\Http\Controllers\Api\V1\Calls;

use App\Actions\Calls\SubmitCallResultAction;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Calls\StartCallRequest;
use App\Http\Requests\V1\Calls\SubmitCallResultRequest;
use App\Http\Resources\V1\CallResource;
use App\Http\Resources\V1\FollowUpResource;
use App\Http\Resources\V1\LeadResource;
use App\Http\Resources\V1\SaleResource;
use App\Models\Call;
use App\Models\Lead;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
    public function __construct(private readonly SubmitCallResultAction $submitCallResult) {}

    public function start(StartCallRequest $request): JsonResponse
    {
        $lead = Lead::query()->findOrFail($request->integer('lead_id'));
        $this->authorize('view', $lead);

        $call = Call::query()->create([
            'lead_id' => $lead->id,
            'agent_id' => $request->user()->id,
            'started_at' => now(),
        ]);

        $lead->status = LeadStatus::InCall;
        $lead->locked_by = $request->user()->id;
        $lead->locked_until = now()->addMinutes(20);
        $lead->save();

        return ApiResponse::success([
            'call' => new CallResource($call),
            'lead' => new LeadResource($lead),
        ], 'تماس شروع شد');
    }

    public function submitResult(SubmitCallResultRequest $request, Call $call): JsonResponse
    {
        $this->authorize('view', $call->lead);

        $result = $this->submitCallResult->execute($call, $request->validated());

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

        return ApiResponse::success(new CallResource($call));
    }
}
