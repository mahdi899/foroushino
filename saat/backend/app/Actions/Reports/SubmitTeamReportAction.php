<?php

namespace App\Actions\Reports;

use App\Enums\RoleName;
use App\Enums\TeamReportStatus;
use App\Models\Call;
use App\Models\Sale;
use App\Models\Team;
use App\Models\TeamReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SubmitTeamReportAction
{
    public function execute(Team $team, User $leader, ?string $leaderNotes = null): TeamReport
    {
        if (! $leader->hasRole(RoleName::Leader->value)) {
            throw new RuntimeException('فقط لیدر تیم می‌تواند گزارش ارسال کند.');
        }

        if ($team->leader_id !== $leader->id) {
            throw new RuntimeException('شما لیدر این تیم نیستید.');
        }

        $reportDate = today();

        return DB::transaction(function () use ($team, $leader, $leaderNotes, $reportDate) {
            $existing = TeamReport::query()
                ->where('team_id', $team->id)
                ->whereDate('report_date', $reportDate)
                ->first();

            if ($existing && $existing->status !== TeamReportStatus::Submitted) {
                throw new RuntimeException('گزارش امروز این تیم قبلاً تایید شده است.');
            }

            $summary = $this->buildSummary($team, $reportDate);

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

        return [
            'calls_today' => $callsToday,
            'successful_today' => $successfulToday,
            'conversion_rate' => $conversion,
            'pending_confirmation' => $pendingConfirmation,
            'payment_submitted' => $paymentSubmitted,
            'active_agents' => $agentIds->count(),
        ];
    }
}
