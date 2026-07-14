<?php

namespace App\Http\Controllers\Api\V1\LiveOps;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CallResource;
use App\Models\Call;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\User;
use App\Services\Analytics\KpiCalculator;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LiveOpsController extends Controller
{
    public function __construct(private readonly KpiCalculator $kpi) {}

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user->hasAnyRole([
                RoleName::Leader->value,
                RoleName::Supervisor->value,
                RoleName::Manager->value,
                RoleName::Admin->value,
            ]),
            403,
        );

        $teamId = TeamScope::canPickTeam($user)
            ? ($request->integer('team_id') ?: null)
            : $user->team_id;

        $agentsQuery = User::query()->role(RoleName::Agent->value)->where('is_active', true);
        if ($teamId) {
            $agentsQuery->where('team_id', $teamId);
        }
        $agentIds = $agentsQuery->pluck('id');

        $activeCalls = Call::query()
            ->with(['lead', 'agent'])
            ->whereIn('agent_id', $agentIds)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->limit(50)
            ->get();

        $overdueFollowups = FollowUp::query()
            ->whereIn('agent_id', $agentIds)
            ->where('status', 'overdue')
            ->count();

        $queuedLeads = Lead::query()
            ->when($teamId, fn ($q) => $q->where('assigned_team_id', $teamId))
            ->whereIn('status', ['queued', 'assigned', 'new'])
            ->whereNull('do_not_call_at')
            ->count();

        return ApiResponse::success([
            'team_id' => $teamId,
            'kpis' => $this->kpi->snapshot($agentIds->all()),
            'active_calls' => CallResource::collection($activeCalls),
            'overdue_followups' => $overdueFollowups,
            'queued_leads' => $queuedLeads,
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}
