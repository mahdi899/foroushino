<?php

namespace App\Actions\Reports;

use App\Enums\RoleName;
use App\Enums\TeamReportStatus;
use App\Models\TeamReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class UpdateTeamReportAction
{
    public function execute(TeamReport $report, User $user, ?string $supervisorNotes = null, ?array $summary = null): TeamReport
    {
        $canSupervisor = $user->hasRole(RoleName::Supervisor->value)
            || $user->hasRole(RoleName::Manager->value)
            || $user->hasRole(RoleName::Admin->value);

        if (! $canSupervisor) {
            throw new RuntimeException('فقط ناظر می‌تواند گزارش را ویرایش کند.');
        }

        if (! in_array($report->status, [TeamReportStatus::Submitted, TeamReportStatus::Approved], true)) {
            throw new RuntimeException('این گزارش در وضعیت قابل ویرایش نیست.');
        }

        return DB::transaction(function () use ($report, $supervisorNotes, $summary) {
            if ($supervisorNotes !== null) {
                $report->supervisor_notes = $supervisorNotes;
            }

            if (is_array($summary)) {
                $report->summary = $summary;
            }

            $report->save();

            return $report->fresh(['team', 'submitter', 'approver']);
        });
    }
}
