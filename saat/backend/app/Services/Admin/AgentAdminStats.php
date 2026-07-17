<?php

namespace App\Services\Admin;

use App\Enums\CallResult;
use App\Enums\CommissionStatus;
use App\Enums\PayoutStatus;
use App\Models\Call;
use App\Models\Commission;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\UserWorkSession;
use Illuminate\Support\Collection;

class AgentAdminStats
{
    /**
     * @param  Collection<int, User>  $users
     */
    public static function attach(Collection $users): void
    {
        $agentIds = $users->pluck('id');
        if ($agentIds->isEmpty()) {
            return;
        }

        $today = today();
        $monthStart = $today->copy()->startOfMonth();
        $positiveResults = array_map(fn (CallResult $result) => $result->value, CallResult::positive());

        $callsToday = Call::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $today)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $successfulToday = Call::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $today)
            ->whereIn('result', $positiveResults)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $callsThisMonth = Call::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $monthStart)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $shiftSecondsThisMonth = UserWorkSession::query()
            ->selectRaw('user_id, sum(total_productive_seconds) as total')
            ->whereIn('user_id', $agentIds)
            ->where('started_at', '>=', $monthStart)
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        $earnedThisMonth = Commission::query()
            ->selectRaw('agent_id, sum(commission_amount) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('available_at', '>=', $monthStart)
            ->whereIn('status', [CommissionStatus::Available, CommissionStatus::Paid])
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $withdrawnThisMonth = PayoutRequest::query()
            ->selectRaw('user_id, sum(amount) as total')
            ->whereIn('user_id', $agentIds)
            ->where('status', PayoutStatus::Paid)
            ->where('processed_at', '>=', $monthStart)
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        foreach ($users as $user) {
            $user->admin_stats = [
                'calls_today' => (int) ($callsToday[$user->id] ?? 0),
                'successful_today' => (int) ($successfulToday[$user->id] ?? 0),
                'calls_this_month' => (int) ($callsThisMonth[$user->id] ?? 0),
                'shift_seconds_this_month' => (int) ($shiftSecondsThisMonth[$user->id] ?? 0),
                'earned_this_month' => (float) ($earnedThisMonth[$user->id] ?? 0),
                'withdrawn_this_month' => (float) ($withdrawnThisMonth[$user->id] ?? 0),
            ];
        }
    }
}
