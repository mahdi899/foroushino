<?php

namespace App\Http\Controllers\Api\V1\Team;

use App\Enums\CallResult;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CallResource;
use App\Http\Resources\V1\UserResource;
use App\Models\Call;
use App\Models\Team;
use App\Models\User;
use App\Services\Admin\AdminDirectoryCache;
use App\Services\Gamification\MonthlyAgentStats;
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

        $teamId = $this->resolveTeamId($user, $request);

        $payload = AdminDirectoryCache::rememberLive($user, $teamId, function () use ($teamId) {
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
                ->where('created_at', '>=', $today)
                ->orderByDesc('created_at')
                ->limit(30)
                ->get();

            $activeCalls = Call::query()
                ->with('lead')
                ->whereIn('agent_id', $agentIds)
                ->whereNull('ended_at')
                ->latest('started_at')
                ->get()
                ->keyBy('agent_id');

            $members = $agents->map(function (User $agent) use ($activeCalls, $callsTodayByAgent, $successfulTodayByAgent) {
                $active = $activeCalls->get($agent->id);

                return [
                    'agent' => (new UserResource($agent))->resolve(),
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
            })->values()->all();

            $onlineCount = $agents->filter(
                fn (User $agent) => ($agent->availability?->value ?? 'offline') !== 'offline',
            )->count();

            return [
                'team_id' => $teamId,
                'online_count' => $onlineCount,
                'members' => $members,
                'recent_calls' => CallResource::collection($recentCalls)->resolve(),
            ];
        });

        return ApiResponse::success($payload);
    }

    public function roster(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user->team_id, 404, 'تیمی به شما اختصاص داده نشده است.');

        $teamId = (int) $user->team_id;

        abort_unless(
            (int) $user->team_id === $teamId,
            403,
            'اجازه دسترسی به این تیم را ندارید.',
        );

        $payload = AdminDirectoryCache::rememberRoster($user, $teamId, function () use ($teamId) {
            $team = Team::query()
                ->with(['leader', 'supervisor'])
                ->findOrFail($teamId);

            $agents = User::query()
                ->role(RoleName::Agent->value)
                ->where('team_id', $teamId)
                ->where('is_active', true)
                ->orderBy('name')
                ->get();

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

            $monthlyStats = MonthlyAgentStats::forAgents($agentIds);

            $members = $agents->map(function (User $agent) use ($callsTodayByAgent, $successfulTodayByAgent, $monthlyStats) {
                $monthly = $monthlyStats[$agent->id] ?? ['calls' => 0, 'successful' => 0, 'points' => 0];

                return [
                    'agent' => (new UserResource($agent))->resolve(),
                    'calls_today' => (int) ($callsTodayByAgent[$agent->id] ?? 0),
                    'successful_today' => (int) ($successfulTodayByAgent[$agent->id] ?? 0),
                    'calls_this_month' => $monthly['calls'],
                    'successful_this_month' => $monthly['successful'],
                    'points_this_month' => $monthly['points'],
                ];
            })->values()->all();

            return [
                'team' => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'leader_id' => $team->leader_id,
                    'supervisor_id' => $team->supervisor_id,
                ],
                'leader' => $team->leader ? (new UserResource($team->leader))->resolve() : null,
                'supervisor' => $team->supervisor ? (new UserResource($team->supervisor))->resolve() : null,
                'agents' => $members,
            ];
        });

        return ApiResponse::success($payload);
    }

    private function resolveTeamId(User $user, Request $request): ?int
    {
        if (! TeamScope::canPickTeam($user)) {
            return $user->team_id ? (int) $user->team_id : null;
        }

        $requestedTeamId = $request->integer('team_id') ?: null;

        if (TeamScope::isOrgWide($user)) {
            return $requestedTeamId;
        }

        $supervisedIds = TeamScope::supervisedTeamIds($user);
        if ($supervisedIds === []) {
            return $user->team_id ? (int) $user->team_id : null;
        }

        if ($requestedTeamId !== null) {
            abort_unless(
                in_array($requestedTeamId, $supervisedIds, true),
                403,
                'اجازه دسترسی به این تیم را ندارید.',
            );

            return $requestedTeamId;
        }

        return $supervisedIds[0];
    }
}
