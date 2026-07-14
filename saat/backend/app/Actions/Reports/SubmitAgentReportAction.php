<?php

namespace App\Actions\Reports;

use App\Enums\AgentReportStatus;
use App\Enums\CallResult;
use App\Enums\RoleName;
use App\Models\AgentReport;
use App\Models\Call;
use App\Models\FollowUp;
use App\Models\Sale;
use App\Models\User;
use App\Support\BusinessDate;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SubmitAgentReportAction
{
    public function execute(User $agent, ?string $agentNotes = null): AgentReport
    {
        if (! $agent->hasRole(RoleName::Agent->value)) {
            throw new RuntimeException('فقط کارشناس می‌تواند گزارش روزانه ارسال کند.');
        }

        if (! $agent->team_id) {
            throw new RuntimeException('شما به تیمی اختصاص نیافته‌اید.');
        }

        $reportDate = BusinessDate::today();

        return DB::transaction(function () use ($agent, $agentNotes, $reportDate) {
            $existing = AgentReport::query()
                ->where('agent_id', $agent->id)
                ->whereDate('report_date', $reportDate)
                ->first();

            if ($existing && $existing->status === AgentReportStatus::Approved) {
                throw new RuntimeException('گزارش امروز شما قبلاً تایید شده است.');
            }

            $summary = $this->buildSummary($agent, $reportDate);

            if ($existing) {
                $existing->fill([
                    'team_id' => $agent->team_id,
                    'status' => AgentReportStatus::Submitted,
                    'summary' => $summary,
                    'agent_notes' => $agentNotes,
                    'leader_notes' => null,
                    'approved_by' => null,
                    'approved_at' => null,
                    'rejected_by' => null,
                    'rejected_at' => null,
                ]);
                $existing->save();

                return $existing->fresh(['agent', 'team']);
            }

            return AgentReport::query()->create([
                'agent_id' => $agent->id,
                'team_id' => $agent->team_id,
                'report_date' => $reportDate,
                'status' => AgentReportStatus::Submitted,
                'summary' => $summary,
                'agent_notes' => $agentNotes,
            ])->fresh(['agent', 'team']);
        });
    }

    /** @return array<string, int|float> */
    private function buildSummary(User $agent, \Illuminate\Support\Carbon $reportDate): array
    {
        $callsToday = Call::query()
            ->where('agent_id', $agent->id)
            ->whereDate('created_at', $reportDate)
            ->count();

        $positiveResults = array_map(fn (CallResult $result) => $result->value, CallResult::positive());

        $successfulToday = Call::query()
            ->where('agent_id', $agent->id)
            ->whereDate('created_at', $reportDate)
            ->whereIn('result', $positiveResults)
            ->count();

        $followupsCompleted = FollowUp::query()
            ->where('agent_id', $agent->id)
            ->whereDate('completed_at', $reportDate)
            ->count();

        $salesSubmitted = Sale::query()
            ->where('agent_id', $agent->id)
            ->whereDate('created_at', $reportDate)
            ->count();

        $conversion = $callsToday > 0 ? round(($successfulToday / $callsToday) * 100, 1) : 0.0;

        return [
            'calls_today' => $callsToday,
            'successful_today' => $successfulToday,
            'conversion_rate' => $conversion,
            'followups_completed' => $followupsCompleted,
            'sales_submitted' => $salesSubmitted,
        ];
    }
}
