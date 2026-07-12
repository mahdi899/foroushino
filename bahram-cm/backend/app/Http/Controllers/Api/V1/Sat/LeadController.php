<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Enums\SatLeadStatus;
use App\Http\Controllers\Controller;
use App\Models\SatLead;
use App\Services\Sat\SatAccessService;
use App\Support\ApiResponse;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeadController extends Controller
{
    public function __construct(private readonly SatAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless(
            $this->access->hasSatPermission($actor, 'sat.leads.view_own')
            || $this->access->hasSatPermission($actor, 'sat.leads.view_team')
            || $this->access->hasSatPermission($actor, 'sat.leads.view_all'),
            403
        );

        $query = SatLead::query()->with('assignee:id,name')->latest();
        $this->access->scopeLeadsFor($actor, $query);

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $leads = $query->paginate($request->integer('per_page', 20));

        return ApiResponse::success($leads);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->hasSatPermission($actor, 'sat.leads.create'), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'source' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $phone = Mobile::normalize($data['phone']) ?? $data['phone'];

        $lead = SatLead::query()->create([
            'name' => $data['name'],
            'phone' => $phone,
            'email' => $data['email'] ?? null,
            'source' => $data['source'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => SatLeadStatus::New,
            'assigned_to' => $data['assigned_to'] ?? $actor->id,
            'created_by' => $actor->id,
        ]);

        return ApiResponse::success(['lead' => $lead->load('assignee:id,name')], 201);
    }

    public function show(Request $request, SatLead $lead): JsonResponse
    {
        $this->authorizeLead($request, $lead);

        return ApiResponse::success([
            'lead' => $lead->load(['assignee:id,name', 'calls', 'activities']),
        ]);
    }

    public function update(Request $request, SatLead $lead): JsonResponse
    {
        $actor = $request->user();
        $this->authorizeLeadManage($actor, $lead);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'phone' => ['sometimes', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::enum(SatLeadStatus::class)],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        if (isset($data['phone'])) {
            $data['phone'] = Mobile::normalize($data['phone']) ?? $data['phone'];
        }

        $lead->update($data);

        return ApiResponse::success(['lead' => $lead->fresh()->load('assignee:id,name')]);
    }

    private function authorizeLead(Request $request, SatLead $lead): void
    {
        $actor = $request->user();
        abort_unless(
            $this->access->hasSatPermission($actor, 'sat.leads.view_own')
            || $this->access->hasSatPermission($actor, 'sat.leads.view_team')
            || $this->access->hasSatPermission($actor, 'sat.leads.view_all'),
            403
        );

        $scoped = SatLead::query()->whereKey($lead->id);
        $this->access->scopeLeadsFor($actor, $scoped);
        abort_unless($scoped->exists(), 403);
    }

    private function authorizeLeadManage(\App\Models\User $actor, SatLead $lead): void
    {
        if ($this->access->hasSatPermission($actor, 'sat.leads.manage_all')) {
            return;
        }

        if ($this->access->hasSatPermission($actor, 'sat.leads.manage_team')) {
            $teamIds = array_merge([$actor->id], $this->access->teamMemberIds($actor));
            abort_unless(in_array($lead->assigned_to, $teamIds, true), 403);

            return;
        }

        abort_unless(
            $this->access->hasSatPermission($actor, 'sat.leads.manage_own')
            && $lead->assigned_to === $actor->id,
            403
        );
    }
}
