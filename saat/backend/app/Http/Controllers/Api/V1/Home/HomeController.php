<?php

namespace App\Http\Controllers\Api\V1\Home;

use App\Enums\LeadStatus;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\LeadResource;
use App\Models\DailyTarget;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\Sale;
use App\Models\Team;
use App\Models\User;
use App\Models\Wallet;
use App\Support\ApiResponse;
use App\Support\LeadPriorityScore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function agent(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = today();

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

        $suggestedLead = Lead::query()
            ->whereNotIn('status', array_map(fn ($s) => $s->value, LeadStatus::excludedFromCycle()))
            ->whereNull('do_not_call_at')
            ->where(function ($q): void {
                $q->whereNull('locked_by')->orWhere('locked_until', '<', now());
            })
            ->where(function ($q) use ($user): void {
                $q->where('assigned_agent_id', $user->id)->orWhereNull('assigned_agent_id');
            })
            ->selectRaw('leads.*, ('.LeadPriorityScore::sqlExpression().') as priority_score')
            ->orderByDesc('priority_score')
            ->first();

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
            'suggested_lead' => $suggestedLead ? new LeadResource($suggestedLead) : null,
            'suggested_reason' => $suggestedLead ? LeadPriorityScore::reasonFor($suggestedLead)->value : null,
            'wallet' => [
                'balance_available' => (string) $wallet->balance_available,
                'balance_pending' => (string) $wallet->balance_pending,
            ],
            'unread_notifications' => $unreadNotifications,
            'availability' => $user->availability?->value,
            'level' => $user->level,
            'points' => $user->points,
            'streak' => $user->streak,
        ]);
    }

    public function management(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value, RoleName::Leader->value])) {
            return ApiResponse::error('اجازه دسترسی ندارید.', status: 403, code: 'forbidden');
        }

        $isTeamScoped = $user->hasRole(RoleName::Leader->value) && $user->team_id;

        $leadsQuery = Lead::query();
        $salesQuery = Sale::query();
        $agentsQuery = User::query()->role(RoleName::Agent->value);

        if ($isTeamScoped) {
            $leadsQuery->where('assigned_team_id', $user->team_id);
            $salesQuery->where('team_id', $user->team_id);
            $agentsQuery->where('team_id', $user->team_id);
        }

        $today = today();

        $pipeline = (clone $leadsQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $salesToday = (clone $salesQuery)->whereDate('created_at', $today)->count();
        $confirmedTotal = (clone $salesQuery)->where('status', 'confirmed')->sum('amount');
        $pendingConfirmationCount = (clone $salesQuery)->where('status', 'pending_confirmation')->count();
        $activeAgents = (clone $agentsQuery)->where('is_active', true)->count();
        $onlineAgents = (clone $agentsQuery)->where('availability', '!=', 'offline')->count();
        $teamsCount = Team::query()->count();

        return ApiResponse::success([
            'pipeline' => $pipeline,
            'sales_today' => $salesToday,
            'confirmed_sales_total' => (string) $confirmedTotal,
            'pending_confirmation_count' => $pendingConfirmationCount,
            'active_agents' => $activeAgents,
            'online_agents' => $onlineAgents,
            'teams_count' => $teamsCount,
            'scope' => $isTeamScoped ? 'team' : 'all',
        ]);
    }
}
