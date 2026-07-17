<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreTeamRequest;
use App\Http\Requests\V1\Admin\UpdateTeamRequest;
use App\Http\Resources\V1\TeamAdminResource;
use App\Models\Team;
use App\Models\User;
use App\Support\AdminScope;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);

        $query = Team::query()
            ->with(['leader', 'supervisor'])
            ->withCount('members')
            ->withCount([
                'members as agents_count' => fn ($q) => $q
                    ->role(RoleName::Agent->value)
                    ->where('is_active', true),
            ])
            ->orderBy('name');
        $user = $request->user();

        if ($user && ! TeamScope::isOrgWide($user)) {
            $teamIds = TeamScope::supervisedTeamIds($user);
            if ($teamIds !== []) {
                $query->whereIn('id', $teamIds);
            } elseif ($user->team_id) {
                $query->where('id', $user->team_id);
            } else {
                $query->whereRaw('0 = 1');
            }
        }

        return ApiResponse::success(TeamAdminResource::collection($query->get()));
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

        return ApiResponse::success(
            new TeamAdminResource($team->fresh(['leader', 'supervisor'])->loadCount('members')),
            'تیم به‌روزرسانی شد',
        );
    }

    private function authorizeView(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('users.view'), 403, 'اجازه دسترسی ندارید.');
    }
}
