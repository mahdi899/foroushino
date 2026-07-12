<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Enums\SatReviewStatus;
use App\Http\Controllers\Controller;
use App\Models\SatActivity;
use App\Models\SatLead;
use App\Services\Sat\SatAccessService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActivityController extends Controller
{
    public function __construct(private readonly SatAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless(
            $this->access->hasSatPermission($actor, 'sat.activities.view_own')
            || $this->access->hasSatPermission($actor, 'sat.activities.view_team')
            || $this->access->hasSatPermission($actor, 'sat.activities.view_all'),
            403
        );

        $query = SatActivity::query()
            ->with(['lead:id,name,phone', 'staff:id,name'])
            ->latest();

        $this->access->scopeByStaffColumn($actor, $query);

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        return ApiResponse::success($query->paginate($request->integer('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->hasSatPermission($actor, 'sat.activities.create'), 403);

        $data = $request->validate([
            'sat_lead_id' => ['required', 'integer', 'exists:sat_leads,id'],
            'type' => ['required', 'string', 'max:40'],
            'description' => ['nullable', 'string'],
        ]);

        $lead = SatLead::query()->findOrFail($data['sat_lead_id']);
        abort_unless($lead->assigned_to === $actor->id || $this->access->hasSatPermission($actor, 'sat.leads.manage_team'), 403);

        $activity = SatActivity::query()->create([
            'sat_lead_id' => $lead->id,
            'staff_id' => $actor->id,
            'type' => $data['type'],
            'description' => $data['description'] ?? null,
            'status' => SatReviewStatus::Pending,
        ]);

        return ApiResponse::success(['activity' => $activity->load('lead:id,name,phone')], 201);
    }

    public function approve(Request $request, SatActivity $activity): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->hasSatPermission($actor, 'sat.activities.approve'), 403);
        $this->authorizeTeamActivity($actor, $activity);

        $data = $request->validate([
            'review_notes' => ['nullable', 'string'],
        ]);

        $activity->update([
            'status' => SatReviewStatus::Approved,
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        return ApiResponse::success(['activity' => $activity->fresh()]);
    }

    public function reject(Request $request, SatActivity $activity): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->hasSatPermission($actor, 'sat.activities.reject'), 403);
        $this->authorizeTeamActivity($actor, $activity);

        $data = $request->validate([
            'review_notes' => ['required', 'string'],
        ]);

        $activity->update([
            'status' => SatReviewStatus::Rejected,
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'],
        ]);

        return ApiResponse::success(['activity' => $activity->fresh()]);
    }

    private function authorizeTeamActivity(\App\Models\User $actor, SatActivity $activity): void
    {
        if ($this->access->hasSatPermission($actor, 'sat.activities.view_all')) {
            return;
        }

        $teamIds = array_merge([$actor->id], $this->access->teamMemberIds($actor));
        abort_unless(in_array($activity->staff_id, $teamIds, true), 403);
    }
}
