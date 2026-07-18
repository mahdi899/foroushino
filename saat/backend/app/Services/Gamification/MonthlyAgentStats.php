<?php

namespace App\Services\Gamification;

use App\Enums\CallResult;
use App\Models\Call;
use App\Models\Sale;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

final class MonthlyAgentStats
{
    public const POINTS_PER_CALL = 2;

    public const POINTS_PER_SALE = 50;

    /**
     * @param  Collection<int, int|string>  $agentIds
     * @return array<int, array{calls: int, successful: int, points: int}>
     */
    public static function forAgents(Collection $agentIds, ?Carbon $now = null): array
    {
        if ($agentIds->isEmpty()) {
            return [];
        }

        $since = ($now ?? now())->copy()->startOfMonth();
        $positiveResults = array_map(fn (CallResult $result) => $result->value, CallResult::positive());

        $callsByAgent = Call::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $since)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $successfulByAgent = Call::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $since)
            ->whereIn('result', $positiveResults)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $salesByAgent = Sale::query()
            ->selectRaw('agent_id, count(*) as total')
            ->whereIn('agent_id', $agentIds)
            ->where('status', 'confirmed')
            ->where('confirmed_at', '>=', $since)
            ->groupBy('agent_id')
            ->pluck('total', 'agent_id');

        $stats = [];

        foreach ($agentIds as $agentId) {
            $calls = (int) ($callsByAgent[$agentId] ?? 0);
            $successful = (int) ($successfulByAgent[$agentId] ?? 0);
            $sales = (int) ($salesByAgent[$agentId] ?? 0);

            $stats[(int) $agentId] = [
                'calls' => $calls,
                'successful' => $successful,
                'points' => ($calls * self::POINTS_PER_CALL) + ($sales * self::POINTS_PER_SALE),
            ];
        }

        return $stats;
    }
}
