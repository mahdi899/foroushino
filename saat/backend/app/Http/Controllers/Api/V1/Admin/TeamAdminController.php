<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\AssignSupervisorTeamsRequest;
use App\Http\Requests\V1\Admin\DeleteTeamRequest;
use App\Http\Requests\V1\Admin\StoreTeamRequest;
use App\Http\Requests\V1\Admin\SyncTeamMembersRequest;
use App\Http\Requests\V1\Admin\UpdateTeamRequest;
use App\Http\Resources\V1\TeamAdminResource;
use App\Models\Team;
use App\Models\User;
use App\Services\Admin\AdminDirectoryCache;
use App\Support\AdminScope;
use App\Support\ApiResponse;
use App\Support\TeamCapacity;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeamAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);
        $user = $request->user();
        abort_unless($user, 401);

        $teams = AdminDirectoryCache::rememberTeams($user, function () use ($request, $user) {
            $query = Team::query()
                ->with(['leader', 'supervisor'])
                ->withCount('members')
                ->withCount([
                    'members as agents_count' => fn ($q) => $q
                        ->role(RoleName::Agent->value)
                        ->where('is_active', true),
                ])
                ->orderBy('name');

            if (! TeamScope::isOrgWide($user)) {
                $teamIds = TeamScope::supervisedTeamIds($user);
                if ($teamIds !== []) {
                    $query->whereIn('id', $teamIds);
                } elseif ($user->team_id) {
                    $query->where('id', $user->team_id);
                } else {
                    $query->whereRaw('0 = 1');
                }
            }

            return TeamAdminResource::collection($query->get())->resolve();
        });

        return ApiResponse::success($teams);
    }

    public function store(StoreTeamRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['supervisor_id'] = AdminScope::resolveSupervisorIdForTeamCreate(
            $request->user(),
            isset($data['supervisor_id']) ? (int) $data['supervisor_id'] : null,
        );

        $team = Team::query()->create($data);

        if (! empty($data['leader_id'])) {
            User::query()
                ->whereKey($data['leader_id'])
                ->update(['team_id' => $team->id]);
        }

        AdminDirectoryCache::bump();

        return ApiResponse::success(
            new TeamAdminResource($team->fresh(['leader', 'supervisor'])->loadCount('members')),
            'تیم ایجاد شد',
            status: 201,
        );
    }

    public function update(UpdateTeamRequest $request, Team $team): JsonResponse
    {
        $data = $request->validated();
        $team->update($data);

        if (array_key_exists('leader_id', $data) && $data['leader_id']) {
            User::query()
                ->whereKey($data['leader_id'])
                ->update(['team_id' => $team->id]);
        }

        AdminDirectoryCache::bump();

        return ApiResponse::success(
            new TeamAdminResource($team->fresh(['leader', 'supervisor'])->loadCount('members')),
            'تیم به‌روزرسانی شد',
        );
    }

    public function destroy(DeleteTeamRequest $request, Team $team): JsonResponse
    {
        DB::transaction(function () use ($team): void {
            User::query()
                ->where('team_id', $team->id)
                ->update(['team_id' => null]);

            $team->delete();
        });

        AdminDirectoryCache::bump();

        return ApiResponse::success(null, 'تیم حذف شد');
    }

    public function syncMembers(SyncTeamMembersRequest $request, Team $team): JsonResponse
    {
        $agentIds = collect($request->validated('agent_ids'))
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        DB::transaction(function () use ($team, $agentIds, $request): void {
            $actor = $request->user();
            abort_unless($actor, 401);

            $allowedIds = User::query()
                ->whereIn('id', $agentIds)
                ->get()
                ->filter(fn (User $agent) => AdminScope::canManageUser($actor, $agent))
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if (count($allowedIds) !== count($agentIds)) {
                abort(403, 'اجازه مدیریت همه کارشناسان انتخاب‌شده را ندارید.');
            }

            User::query()
                ->role(RoleName::Agent->value)
                ->where('team_id', $team->id)
                ->when($agentIds !== [], fn ($query) => $query->whereNotIn('id', $agentIds))
                ->get()
                ->each(function (User $agent) use ($actor): void {
                    abort_unless(
                        AdminScope::canManageUser($actor, $agent),
                        403,
                        'اجازه حذف این کارشناس از تیم را ندارید.',
                    );
                });

            User::query()
                ->role(RoleName::Agent->value)
                ->where('team_id', $team->id)
                ->when($agentIds !== [], fn ($query) => $query->whereNotIn('id', $agentIds))
                ->update(['team_id' => null]);

            if ($agentIds !== []) {
                User::query()
                    ->role(RoleName::Agent->value)
                    ->whereIn('id', $agentIds)
                    ->update(['team_id' => $team->id]);
            }

            TeamCapacity::enforceForTeam((int) $team->id);
        });

        AdminDirectoryCache::bump();

        return ApiResponse::success(
            new TeamAdminResource($team->fresh(['leader', 'supervisor'])->loadCount('members')),
            'اعضای تیم به‌روزرسانی شد',
        );
    }

    public function assignSupervisorTeams(AssignSupervisorTeamsRequest $request, User $user): JsonResponse
    {
        $teamIds = collect($request->validated('team_ids'))
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        DB::transaction(function () use ($user, $teamIds): void {
            Team::query()
                ->where('supervisor_id', $user->id)
                ->when($teamIds !== [], fn ($query) => $query->whereNotIn('id', $teamIds))
                ->update(['supervisor_id' => null]);

            if ($teamIds !== []) {
                Team::query()
                    ->whereIn('id', $teamIds)
                    ->update(['supervisor_id' => $user->id]);
            }
        });

        AdminDirectoryCache::bump();

        $teams = Team::query()
            ->with(['leader', 'supervisor'])
            ->withCount('members')
            ->whereIn('id', $teamIds)
            ->orderBy('name')
            ->get();

        return ApiResponse::success(
            TeamAdminResource::collection($teams),
            'تیم‌های ناظر به‌روزرسانی شد',
        );
    }

    private function authorizeView(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('users.view'), 403, 'اجازه دسترسی ندارید.');
    }
}
