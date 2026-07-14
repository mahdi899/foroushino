<?php

namespace App\Http\Controllers\Api\V1\Team;

use App\Enums\CallResult;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CallResource;
use App\Http\Resources\V1\UserResource;
use App\Models\Call;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function live(Request $request): JsonResponse
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
            'اجازه دسترسی ندارید.',
        );

        $teamId = TeamScope::canPickTeam($user)
            ? ($request->integer('team_id') ?: null)
            : $user->team_id;

        $agentsQuery = User::query()
            ->role(RoleName::Agent->value)
            ->where('is_active', true)
            ->orderBy('name');

        if ($teamId) {
            $agentsQuery->where('team_id', $teamId);
        }

        $agents = $agentsQuery->get();
        $agentIds = $agents->pluck('id');
        $today = today();
        $positiveResults = array_map(fn (CallResult $result) => $result->value, CallResult::positive());

        $callsTodayByAgent = Call::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $today)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $successfulTodayByAgent = Call::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $today)
            ->whereIn('result', $positiveResults)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $recentCalls = Call::query()
            ->with(['lead', 'agent'])
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', today())
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        $activeCalls = Call::query()
            ->whereIn('agent_id', $agentIds)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->get()
            ->keyBy('agent_id');

        $members = $agents->map(function (User $agent) use ($activeCalls, $callsTodayByAgent, $successfulTodayByAgent) {
            $active = $activeCalls->get($agent->id);

            return [
                'agent' => new UserResource($agent),
                'availability' => $agent->availability?->value ?? 'offline',
                'availability_changed_at' => $agent->availability_changed_at?->toIso8601String(),
                'calls_today' => (int) ($callsTodayByAgent[$agent->id] ?? 0),
                'successful_today' => (int) ($successfulTodayByAgent[$agent->id] ?? 0),
                'active_call' => $active ? [
                    'lead_id' => $active->lead_id,
                    'lead_name' => $active->lead?->fullName(),
                    'started_at' => $active->started_at?->toIso8601String(),
                ] : null,
            ];
        });

        $onlineCount = $agents->filter(
            fn (User $agent) => ($agent->availability?->value ?? 'offline') !== 'offline',
        )->count();

        return ApiResponse::success([
            'team_id' => $teamId,
            'online_count' => $onlineCount,
            'members' => $members,
            'recent_calls' => CallResource::collection($recentCalls),
        ]);
    }
}
