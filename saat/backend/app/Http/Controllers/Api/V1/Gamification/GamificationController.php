<?php

namespace App\Http\Controllers\Api\V1\Gamification;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AchievementResource;
use App\Models\Achievement;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function achievements(Request $request): JsonResponse
    {
        $user = $request->user();

        $achievements = Achievement::query()
            ->with(['userAchievements' => fn ($q) => $q->where('user_id', $user->id)])
            ->get();

        return ApiResponse::success(AchievementResource::collection($achievements));
    }

    public function leaderboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $scope = $request->input('scope', 'team');

        $query = User::query()->role(RoleName::Agent->value)->where('is_active', true);

        if ($scope === 'team' && $user->team_id) {
            $query->where('team_id', $user->team_id);
        }

        $since = now()->startOfMonth();

        $agents = $query->withCount([
            'sales as confirmed_sales_count' => fn ($q) => $q->where('status', 'confirmed')->where('created_at', '>=', $since),
        ])->get()
            ->sortByDesc(fn (User $agent) => ($agent->confirmed_sales_count * 1_000_000) + $agent->points)
            ->values()
            ->take(20)
            ->map(fn (User $agent, int $index) => [
                'rank' => $index + 1,
                'agent_id' => $agent->id,
                'agent_name' => $agent->name,
                'avatar' => $agent->avatar,
                'confirmed_sales_this_month' => $agent->confirmed_sales_count,
                'points' => $agent->points,
                'level' => $agent->level,
                'streak' => $agent->streak,
                'is_me' => $agent->id === $user->id,
            ]);

        return ApiResponse::success([
            'scope' => $scope === 'team' && $user->team_id ? 'team' : 'company',
            'entries' => $agents,
        ]);
    }
}
