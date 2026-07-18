<?php

namespace App\Actions\Reports;

use App\Enums\RoleName;
use App\Enums\TeamReportStatus;
use App\Models\Call;
use App\Models\Commission;
use App\Models\Sale;
use App\Models\Team;
use App\Models\TeamReport;
use App\Models\User;
use App\Models\UserWorkSession;
use App\Support\BusinessDate;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SubmitTeamReportAction
{
    public function execute(Team $team, User $leader, ?string $leaderNotes = null, ?array $summaryOverride = null): TeamReport
    {
        if (! $leader->hasRole(RoleName::Leader->value)) {
            throw new RuntimeException('فقط لیدر تیم می‌تواند گزارش ارسال کند.');
        }

        if ($team->leader_id !== $leader->id) {
            throw new RuntimeException('شما لیدر این تیم نیستید.');
        }

        $reportDate = BusinessDate::today();

        return DB::transaction(function () use ($team, $leader, $leaderNotes, $reportDate, $summaryOverride) {
            $existing = TeamReport::query()
                ->where('team_id', $team->id)
                ->whereDate('report_date', $reportDate)
                ->first();

            if ($existing && $existing->status !== TeamReportStatus::Submitted) {
                throw new RuntimeException('گزارش امروز این تیم قبلاً تایید شده است.');
            }

            $summary = is_array($summaryOverride) && $summaryOverride !== []
                ? $summaryOverride
                : $this->buildSummary($team, $reportDate);

            if ($existing) {
                $existing->fill([
                    'submitted_by' => $leader->id,
                    'status' => TeamReportStatus::Submitted,
                    'summary' => $summary,
                    'leader_notes' => $leaderNotes,
                    'supervisor_notes' => null,
                    'approved_by' => null,
                    'approved_at' => null,
                    'forwarded_by' => null,
                    'forwarded_at' => null,
                ]);
                $existing->save();

                return $existing->fresh(['team', 'submitter']);
            }

            return TeamReport::query()->create([
                'team_id' => $team->id,
                'submitted_by' => $leader->id,
                'report_date' => $reportDate,
                'status' => TeamReportStatus::Submitted,
                'summary' => $summary,
                'leader_notes' => $leaderNotes,
            ])->fresh(['team', 'submitter']);
        });
    }

    /** @return array<string, int|float|string> */
    private function buildSummary(Team $team, \Illuminate\Support\Carbon $reportDate): array
    {
        $agentIds = User::query()
            ->role(RoleName::Agent->value)
            ->where('team_id', $team->id)
            ->pluck('id');

        $callsToday = Call::query()
            ->whereIn('agent_id', $agentIds)
            ->whereDate('created_at', $reportDate)
            ->count();

        $successfulToday = Call::query()
            ->whereIn('agent_id', $agentIds)
            ->whereDate('created_at', $reportDate)
            ->whereIn('result', ['interested', 'very_hot', 'meeting_set', 'payment_pending', 'registered'])
            ->count();

        $pendingConfirmation = Sale::query()
            ->where('team_id', $team->id)
            ->where('status', 'pending_confirmation')
            ->count();

        $paymentSubmitted = Sale::query()
            ->where('team_id', $team->id)
            ->where('status', 'payment_submitted')
            ->count();

        $conversion = $callsToday > 0 ? round(($successfulToday / $callsToday) * 100, 1) : 0.0;
        $agents = $this->buildAgentEntries($agentIds, $reportDate);

        return [
            'calls_today' => $callsToday,
            'successful_today' => $successfulToday,
            'conversion_rate' => $conversion,
            'pending_confirmation' => $pendingConfirmation,
            'payment_submitted' => $paymentSubmitted,
            'active_agents' => $agentIds->count(),
            'agents' => $agents,
            'narrative' => $this->buildNarrative($agents),
        ];
    }

    /** @param \Illuminate\Support\Collection<int, int> $agentIds
     * @return list<array<string, mixed>>
     */
    private function buildAgentEntries($agentIds, \Illuminate\Support\Carbon $reportDate): array
    {
        $agents = User::query()->whereIn('id', $agentIds)->get()->keyBy('id');
        $entries = [];

        foreach ($agentIds as $agentId) {
            $agent = $agents->get($agentId);
            if (! $agent) {
                continue;
            }

            $callsToday = Call::query()
                ->where('agent_id', $agentId)
                ->whereDate('created_at', $reportDate)
                ->count();

            $successfulToday = Call::query()
                ->where('agent_id', $agentId)
                ->whereDate('created_at', $reportDate)
                ->whereIn('result', ['interested', 'very_hot', 'meeting_set', 'payment_pending', 'registered'])
                ->count();

            $commissionToday = (int) Commission::query()
                ->where('agent_id', $agentId)
                ->whereDate('created_at', $reportDate)
                ->sum('commission_amount');

            $shiftSeconds = (int) UserWorkSession::query()
                ->where('user_id', $agentId)
                ->whereDate('started_at', $reportDate)
                ->sum('total_productive_seconds');

            $conversion = $callsToday > 0 ? round(($successfulToday / $callsToday) * 100, 1) : 0.0;

            $entries[] = [
                'agent_id' => (string) $agentId,
                'agent_name' => $agent->name,
                'source' => [
                    'calls_today' => $callsToday,
                    'successful_today' => $successfulToday,
                    'conversion_rate' => $conversion,
                    'commission_today' => $commissionToday,
                    'shift_seconds' => $shiftSeconds,
                ],
                'review_status' => 'pending',
            ];
        }

        usort($entries, function (array $a, array $b): int {
            $rateA = $a['source']['conversion_rate'] ?? 0;
            $rateB = $b['source']['conversion_rate'] ?? 0;
            if ($rateA !== $rateB) {
                return $rateB <=> $rateA;
            }

            return ($b['source']['calls_today'] ?? 0) <=> ($a['source']['calls_today'] ?? 0);
        });

        return $entries;
    }

    /** @param list<array<string, mixed>> $agents */
    private function buildNarrative(array $agents): string
    {
        $lines = [];
        foreach ($agents as $entry) {
            $source = $entry['source'] ?? [];
            $name = $entry['agent_name'] ?? 'کارشناس';
            $calls = (int) ($source['calls_today'] ?? 0);
            $successful = (int) ($source['successful_today'] ?? 0);
            $conversion = (float) ($source['conversion_rate'] ?? 0);
            $commission = number_format((int) ($source['commission_today'] ?? 0));
            $hours = (int) floor(((int) ($source['shift_seconds'] ?? 0)) / 3600);
            $lines[] = "{$name}: {$calls} تماس · {$successful} موفق ({$conversion}٪) · {$commission} تومان پورسانت · {$hours} ساعت شیفت";
        }

        return implode("\n", $lines);
    }
}
