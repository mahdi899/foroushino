<?php

namespace App\Actions\Reports;

use App\Enums\TeamReportStatus;
use App\Models\TeamReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ApproveTeamReportAction
{
    public function execute(TeamReport $report, User $supervisor, ?string $supervisorNotes = null): TeamReport
    {
        if ($report->status !== TeamReportStatus::Submitted) {
            throw new RuntimeException('این گزارش در وضعیت قابل تایید نیست.');
        }

        return DB::transaction(function () use ($report, $supervisor, $supervisorNotes) {
            $report->status = TeamReportStatus::Approved;
            $report->supervisor_notes = $supervisorNotes;
            $report->approved_by = $supervisor->id;
            $report->approved_at = now();
            $report->save();

            return $report->fresh(['team', 'submitter', 'approver']);
        });
    }
}
