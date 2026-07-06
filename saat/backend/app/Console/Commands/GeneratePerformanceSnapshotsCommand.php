<?php

namespace App\Console\Commands;

use App\Enums\CallResult;
use App\Enums\RoleName;
use App\Models\Call;
use App\Models\Commission;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\PerformanceSnapshot;
use App\Models\Sale;
use App\Models\User;
use App\Services\AchievementService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class GeneratePerformanceSnapshotsCommand extends Command
{
    protected $signature = 'performance:snapshot {date? : Y-m-d date to snapshot, defaults to today}';

    protected $description = 'Aggregates each agent\'s daily call/sale/quality metrics into performance_snapshots, avoiding live aggregation over the calls table on every dashboard load.';

    public function handle(AchievementService $achievements): int
    {
        $date = $this->argument('date') ? Carbon::parse($this->argument('date')) : today();
        $positiveResults = array_map(fn ($r) => $r->value, CallResult::positive());

        $agents = User::query()->role(RoleName::Agent->value)->get();

        foreach ($agents as $agent) {
            $calls = Call::query()->where('agent_id', $agent->id)->whereDate('created_at', $date);
            $callsCount = (clone $calls)->count();
            $successfulCount = (clone $calls)->whereIn('result', $positiveResults)->count();
            $avgTalkSec = (int) round((clone $calls)->avg('duration_sec') ?? 0);
            $notedCalls = (clone $calls)->whereNotNull('note')->where('note', '!=', '')->count();
            $noteQuality = $callsCount > 0 ? round(($notedCalls / $callsCount) * 100, 2) : 0;
            $conversionRate = $callsCount > 0 ? round(($successfulCount / $callsCount) * 100, 2) : 0;

            $hotLeads = Lead::query()->where('assigned_agent_id', $agent->id)->where('temperature', 'hot')->count();
            $overdueFollowups = FollowUp::query()->where('agent_id', $agent->id)->overdue()->count();
            $confirmedSales = Sale::query()->where('agent_id', $agent->id)->where('status', 'confirmed')
                ->whereDate('confirmed_at', $date)->count();
            $approvedCommission = Commission::query()->where('agent_id', $agent->id)
                ->whereIn('status', ['approved', 'available'])->whereDate('updated_at', $date)->sum('commission_amount');

            $score = round(
                ($conversionRate * 0.4) + ($noteQuality * 0.2) + (min($callsCount, 50) * 0.4),
                2
            );

            PerformanceSnapshot::query()->updateOrCreate(
                ['user_id' => $agent->id, 'date' => $date->toDateString()],
                [
                    'calls_count' => $callsCount,
                    'successful_count' => $successfulCount,
                    'conversion_rate' => $conversionRate,
                    'avg_talk_sec' => $avgTalkSec,
                    'note_quality' => $noteQuality,
                    'hot_leads' => $hotLeads,
                    'overdue_followups' => $overdueFollowups,
                    'confirmed_sales' => $confirmedSales,
                    'approved_commission' => $approvedCommission,
                    'score' => $score,
                ],
            );

            if ($conversionRate >= 15 && $callsCount >= 10) {
                $achievements->unlock($agent, 'quality_master');
            }
        }

        $this->info("Generated performance snapshots for {$agents->count()} agent(s) on {$date->toDateString()}.");

        return self::SUCCESS;
    }
}
