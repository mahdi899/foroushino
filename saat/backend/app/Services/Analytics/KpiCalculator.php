<?php

namespace App\Services\Analytics;

use App\Models\Call;
use App\Models\Sale;
use Carbon\Carbon;

class KpiCalculator
{
    /**
     * @param  list<int>  $agentIds
     * @return array<string, mixed>
     */
    public function snapshot(array $agentIds): array
    {
        $today = today();

        $calls = Call::query()
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $today)
            ->get();

        $completed = $calls->filter(fn (Call $c) => $c->result !== null);
        $answered = $completed->filter(fn (Call $c) => $c->duration_sec > 0);
        $totalDuration = $completed->sum('duration_sec');

        $sales = Sale::query()
            ->whereIn('agent_id', $agentIds)
            ->where('created_at', '>=', $today)
            ->count();

        $contactRate = $completed->count() > 0
            ? round(($answered->count() / $completed->count()) * 100, 1)
            : 0;

        $conversionRate = $completed->count() > 0
            ? round(($sales / $completed->count()) * 100, 1)
            : 0;

        $aht = $answered->count() > 0
            ? (int) round($totalDuration / $answered->count())
            : 0;

        return [
            'calls_today' => $calls->count(),
            'completed_calls' => $completed->count(),
            'contact_rate' => $contactRate,
            'conversion_rate' => $conversionRate,
            'aht_sec' => $aht,
            'sales_today' => $sales,
        ];
    }

    public function isWithinCallingWindow(?string $start, ?string $end, ?Carbon $at = null): bool
    {
        $at ??= now();
        $start = $start ?: '09:00';
        $end = $end ?: '21:00';

        $current = $at->format('H:i');

        return $current >= $start && $current <= $end;
    }
}
