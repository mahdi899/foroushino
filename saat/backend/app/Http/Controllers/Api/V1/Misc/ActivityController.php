<?php

namespace App\Http\Controllers\Api\V1\Misc;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ActivityLogResource;
use App\Models\ActivityLog;
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

        if (TeamScope::isOrgWide($user)) {
            // Org-wide activity for manager/admin.
        } elseif (TeamScope::isTeamColony($user) && $user->team_id) {
            $agentIds = TeamScope::teamAgentIds((int) $user->team_id);
            $query->whereIn('user_id', $agentIds !== [] ? $agentIds : [-1]);
        } else {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('kind')) {
            $query->where('kind', $request->string('kind'));
        }

        if ($request->filled('agent_id') && (TeamScope::isTeamColony($user) || TeamScope::isOrgWide($user))) {
            $query->where('user_id', $request->integer('agent_id'));
        }

        return ApiResponse::success(ActivityLogResource::collection($query->limit(200)->get()));
    }
}
