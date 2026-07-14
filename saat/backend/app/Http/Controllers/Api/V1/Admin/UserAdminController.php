<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\UpdateUserRequest;
use App\Http\Resources\V1\TeamAdminResource;
use App\Http\Resources\V1\UserAdminResource;
use App\Models\Team;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);

        $query = User::query()->with('team')->orderBy('name');
        $user = $request->user();

        if ($user && ! $user->can('reports.view-all') && $user->team_id) {
            $query->where('team_id', $user->team_id);
        }

        return ApiResponse::success(UserAdminResource::collection($query->get()));
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user->update($request->validated());

        return ApiResponse::success(new UserAdminResource($user->fresh('team')), 'کاربر به‌روزرسانی شد');
    }

    private function authorizeView(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('users.view'), 403, 'اجازه دسترسی ندارید.');
    }
}
