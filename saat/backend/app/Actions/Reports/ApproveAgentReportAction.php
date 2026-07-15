<?php

namespace App\Actions\Reports;

use App\Enums\AgentReportStatus;
use App\Models\AgentReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ApproveAgentReportAction
{
    public function execute(AgentReport $report, User $leader, ?string $leaderNotes = null): AgentReport
    {
        if ($report->status !== AgentReportStatus::Submitted) {
            throw new RuntimeException('فقط گزارش‌های ارسال‌شده قابل تایید هستند.');
        }

        if ($report->team?->leader_id !== $leader->id) {
            throw new RuntimeException('شما لیدر این تیم نیستید.');
        }

        return DB::transaction(function () use ($report, $leader, $leaderNotes) {
            $report->fill([
                'status' => AgentReportStatus::Approved,
                'leader_notes' => $leaderNotes,
                'approved_by' => $leader->id,
                'approved_at' => now(),
                'rejected_by' => null,
                'rejected_at' => null,
            ]);
            $report->save();

            return $report->fresh(['agent', 'team', 'approver']);
        });
    }
}
