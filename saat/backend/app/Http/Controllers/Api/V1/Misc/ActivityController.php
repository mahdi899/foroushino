<?php

namespace App\Http\Controllers\Api\V1\Misc;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ActivityLogResource;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ActivityLog::query()->with('user')->orderByDesc('created_at');

        if ($user->can('reports.view-all')) {
            // Org-wide activity for supervisor/manager.
        } elseif ($user->can('reports.view-team') && $user->hasRole(RoleName::Leader->value) && $user->team_id) {
            $teamAgentIds = User::query()
                ->where('team_id', $user->team_id)
                ->pluck('id');
            $query->whereIn('user_id', $teamAgentIds);
        } else {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('kind')) {
            $query->where('kind', $request->string('kind'));
        }

        if ($request->filled('agent_id') && ($user->can('reports.view-team') || $user->can('reports.view-all'))) {
            $query->where('user_id', $request->integer('agent_id'));
        }

        return ApiResponse::success(ActivityLogResource::collection($query->limit(200)->get()));
    }
}
