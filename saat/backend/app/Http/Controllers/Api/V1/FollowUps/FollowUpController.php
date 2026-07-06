<?php

namespace App\Http\Controllers\Api\V1\FollowUps;

use App\Enums\FollowupStatus;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\FollowUps\SnoozeFollowUpRequest;
use App\Http\Requests\V1\FollowUps\StoreFollowUpRequest;
use App\Http\Resources\V1\FollowUpResource;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FollowUpController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = FollowUp::query()->with('lead');

        if (! $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value, RoleName::Leader->value])) {
            $query->where('agent_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        } else {
            $query->where('status', '!=', FollowupStatus::Cancelled->value);
        }

        $followUps = $query->orderBy('due_at')->limit(300)->get();

        return ApiResponse::success(FollowUpResource::collection($followUps));
    }

    public function store(StoreFollowUpRequest $request): JsonResponse
    {
        $lead = Lead::query()->findOrFail($request->integer('lead_id'));
        $this->authorize('view', $lead);

        $dueAt = $request->date('due_at');

        $followUp = DB::transaction(function () use ($request, $lead, $dueAt) {
            $followUp = FollowUp::query()->create([
                'lead_id' => $lead->id,
                'agent_id' => $request->user()->id,
                'kind' => $request->string('kind')->toString(),
                'title' => $request->string('title')->toString(),
                'due_at' => $dueAt,
                'status' => $dueAt->isPast() ? FollowupStatus::Overdue : FollowupStatus::Pending,
                'priority' => $request->integer('priority'),
                'note' => $request->string('note')->toString() ?: null,
            ]);

            $lead->next_followup_at = $dueAt;
            $lead->save();

            return $followUp;
        });

        return ApiResponse::success(new FollowUpResource($followUp), 'پیگیری ثبت شد', status: 201);
    }

    public function complete(Request $request, FollowUp $followUp): JsonResponse
    {
        $this->authorize('update', $followUp);

        $followUp->status = FollowupStatus::Done;
        $followUp->completed_at = now();
        $followUp->save();

        return ApiResponse::success(new FollowUpResource($followUp), 'پیگیری تکمیل شد');
    }

    public function snooze(SnoozeFollowUpRequest $request, FollowUp $followUp): JsonResponse
    {
        $this->authorize('update', $followUp);

        $followUp->status = FollowupStatus::Snoozed;
        $followUp->due_at = $request->date('due_at');
        $followUp->save();

        if ($followUp->lead->next_followup_at?->equalTo($followUp->due_at) !== true) {
            $followUp->lead()->update(['next_followup_at' => $followUp->due_at]);
        }

        $followUp->status = FollowupStatus::Pending;
        $followUp->save();

        return ApiResponse::success(new FollowUpResource($followUp), 'پیگیری به تعویق افتاد');
    }

    public function cancel(Request $request, FollowUp $followUp): JsonResponse
    {
        $this->authorize('update', $followUp);

        $followUp->status = FollowupStatus::Cancelled;
        $followUp->save();

        return ApiResponse::success(new FollowUpResource($followUp), 'پیگیری لغو شد');
    }
}
