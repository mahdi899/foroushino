<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreTeamRequest;
use App\Http\Requests\V1\Admin\UpdateTeamRequest;
use App\Http\Resources\V1\TeamAdminResource;
use App\Models\Team;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);

        $query = Team::query()
            ->with('leader')
            ->withCount('members')
            ->withCount([
                'members as agents_count' => fn ($q) => $q
                    ->role(RoleName::Agent->value)
                    ->where('is_active', true),
            ])
            ->orderBy('name');
        $user = $request->user();

        if ($user && ! $user->can('teams.manage') && ! $user->can('reports.view-all') && $user->team_id) {
            $query->where('id', $user->team_id);
        }

        return ApiResponse::success(TeamAdminResource::collection($query->get()));
    }

    public function store(StoreTeamRequest $request): JsonResponse
    {
        $team = Team::query()->create($request->validated());

        return ApiResponse::success(
            new TeamAdminResource($team->fresh(['leader'])->loadCount('members')),
            'تیم ایجاد شد',
            status: 201,
        );
    }

    public function update(UpdateTeamRequest $request, Team $team): JsonResponse
    {
        $team->update($request->validated());

        return ApiResponse::success(new TeamAdminResource($team->fresh(['leader'])->loadCount('members')), 'تیم به‌روزرسانی شد');
    }

    private function authorizeView(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('users.view'), 403, 'اجازه دسترسی ندارید.');
    }
}
