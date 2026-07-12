<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Enums\SatReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\SatCall;
use App\Models\SatLead;
use App\Services\Sat\SatAccessService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
    public function __construct(private readonly SatAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless(
            $this->access->hasSatPermission($actor, 'sat.calls.view_own')
            || $this->access->hasSatPermission($actor, 'sat.calls.view_team')
            || $this->access->hasSatPermission($actor, 'sat.calls.view_all'),
            403
        );

        $query = SatCall::query()
            ->with(['lead:id,name,phone', 'staff:id,name'])
            ->latest('called_at');

        $this->access->scopeByStaffColumn($actor, $query);

        if ($status = $request->string('review_status')->toString()) {
            $query->where('review_status', $status);
        }

        return ApiResponse::success($query->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->hasSatPermission($actor, 'sat.calls.create'), 403);

        $data = $request->validate([
            'sat_lead_id' => ['required', 'integer', 'exists:sat_leads,id'],
            'direction' => ['nullable', 'string', 'max:20'],
            'outcome' => ['nullable', 'string', 'max:80'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'called_at' => ['nullable', 'date'],
        ]);

        $lead = SatLead::query()->findOrFail($data['sat_lead_id']);
        abort_unless($lead->assigned_to === $actor->id || $this->access->hasSatPermission($actor, 'sat.leads.manage_team'), 403);

        $call = SatCall::query()->create([
            'sat_lead_id' => $lead->id,
            'staff_id' => $actor->id,
            'direction' => $data['direction'] ?? 'outbound',
            'outcome' => $data['outcome'] ?? null,
            'duration_seconds' => $data['duration_seconds'] ?? null,
            'notes' => $data['notes'] ?? null,
            'review_status' => SatReviewStatus::Pending,
            'called_at' => $data['called_at'] ?? now(),
        ]);

        return ApiResponse::success(['call' => $call->load('lead:id,name,phone')], 201);
    }

    public function review(Request $request, SatCall $call): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->hasSatPermission($actor, 'sat.calls.review'), 403);

        if (! $this->access->hasSatPermission($actor, 'sat.calls.view_all')) {
            $teamIds = array_merge([$actor->id], $this->access->teamMemberIds($actor));
            abort_unless(in_array($call->staff_id, $teamIds, true), 403);
        }

        $data = $request->validate([
            'review_status' => ['required', 'in:approved,rejected'],
            'review_notes' => ['nullable', 'string'],
        ]);

        $call->update([
            'review_status' => $data['review_status'],
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        return ApiResponse::success(['call' => $call->fresh()]);
    }
}
