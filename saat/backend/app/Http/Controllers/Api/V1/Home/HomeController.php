<?php

namespace App\Http\Controllers\Api\V1\Home;

use App\Enums\LeadStatus;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Models\DailyTarget;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\Sale;
use App\Models\Team;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Analytics\DashboardCache;
use App\Support\ApiResponse;
use App\Support\BusinessDate;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function agent(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = BusinessDate::today();

        $target = DailyTarget::query()->firstOrCreate(
            ['user_id' => $user->id, 'date' => $today],
            ['call_goal' => $user->call_goal, 'sale_goal' => $user->sale_goal],
        );

        $callsToday = $user->calls()->whereDate('created_at', $today)->count();
        $salesToday = $user->sales()->whereDate('created_at', $today)->count();

        if ($target->calls_made !== $callsToday || $target->sales_made !== $salesToday) {
            $target->calls_made = $callsToday;
            $target->sales_made = $salesToday;
            $target->save();
        }

        $assignedCount = Lead::query()->where('assigned_agent_id', $user->id)
            ->whereNotIn('status', array_map(fn ($s) => $s->value, LeadStatus::excludedFromCycle()))
            ->count();

        $overdueFollowups = FollowUp::query()->where('agent_id', $user->id)->overdue()->count();
        $todayFollowups = FollowUp::query()->where('agent_id', $user->id)
            ->pending()->whereDate('due_at', $today)->count();

        $wallet = Wallet::query()->firstOrCreate(['user_id' => $user->id]);
        $unreadNotifications = $user->appNotifications()->where('read', false)->count();

        return ApiResponse::success([
            'target' => [
                'call_goal' => $target->call_goal,
                'sale_goal' => $target->sale_goal,
                'calls_made' => $target->calls_made,
                'sales_made' => $target->sales_made,
            ],
            'assigned_leads_count' => $assignedCount,
            'overdue_followups' => $overdueFollowups,
            'today_followups' => $todayFollowups,
            'wallet' => [
                'balance_available' => (string) $wallet->balance_available,
                'balance_pending' => (string) $wallet->balance_pending,
                'balance_locked' => (string) $wallet->balance_locked,
                'total_earned' => (string) $wallet->total_earned,
                'total_paid' => (string) $wallet->total_paid,
            ],
            'unread_notifications' => $unreadNotifications,
            'availability' => $user->availability?->value,
            'level' => $user->level,
            'points' => $user->points,
            'streak' => $user->streak,
            'business_date' => BusinessDate::dateKey(),
            'business_timezone' => BusinessDate::timezone(),
        ]);
    }

    public function management(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value, RoleName::Leader->value])) {
            return ApiResponse::error('اجازه دسترسی ندارید.', status: 403, code: 'forbidden');
        }

        $isTeamScoped = TeamScope::isTeamColony($user);
        $teamId = $isTeamScoped && $user->team_id ? $user->team_id : null;
        $today = BusinessDate::today();

        $key = DashboardCache::key('home:management', [
            'team_id' => $teamId,
            'scoped' => $isTeamScoped,
            'date' => $today->toDateString(),
        ]);

        $payload = DashboardCache::remember($key, DashboardCache::HOME_TTL_SECONDS, function () use ($user, $isTeamScoped, $teamId, $today) {
            $leadsQuery = Lead::query();
            $salesQuery = Sale::query();
            $agentsQuery = User::query()->role(RoleName::Agent->value);

            if ($teamId) {
                TeamScope::applyLeadQueryScope($leadsQuery, $user);
                $salesQuery->where('team_id', $teamId);
                $agentsQuery->where('team_id', $teamId);
            }

            $pipeline = (clone $leadsQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
            $salesToday = (clone $salesQuery)->whereDate('created_at', $today)->count();
            $confirmedTotal = (clone $salesQuery)->where('status', 'confirmed')->sum('amount');
            $pendingConfirmationCount = (clone $salesQuery)->where('status', 'pending_confirmation')->count();
            $activeAgents = (clone $agentsQuery)->where('is_active', true)->count();
            $onlineAgents = (clone $agentsQuery)->where('availability', '!=', 'offline')->count();
            $teamsCount = $teamId ? 1 : Team::query()->count();

            return [
                'pipeline' => $pipeline,
                'sales_today' => $salesToday,
                'confirmed_sales_total' => (string) $confirmedTotal,
                'pending_confirmation_count' => $pendingConfirmationCount,
                'active_agents' => $activeAgents,
                'online_agents' => $onlineAgents,
                'teams_count' => $teamsCount,
                'scope' => $isTeamScoped ? 'team' : 'all',
            ];
        });

        return ApiResponse::success($payload);
    }
}
