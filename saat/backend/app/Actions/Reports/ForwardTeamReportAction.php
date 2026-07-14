<?php

namespace App\Actions\Reports;

use App\Enums\NotificationKind;
use App\Enums\RoleName;
use App\Enums\TeamReportStatus;
use App\Models\TeamReport;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ForwardTeamReportAction
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function execute(TeamReport $report, User $supervisor): TeamReport
    {
        if ($report->status !== TeamReportStatus::Approved) {
            throw new RuntimeException('ابتدا گزارش باید توسط سوپروایزر تایید شود.');
        }

        return DB::transaction(function () use ($report, $supervisor) {
            $report->status = TeamReportStatus::ForwardedToManager;
            $report->forwarded_by = $supervisor->id;
            $report->forwarded_at = now();
            $report->save();

            $report->loadMissing('team');

            User::query()
                ->role([RoleName::Manager->value, RoleName::Admin->value])
                ->where('is_active', true)
                ->get()
                ->each(fn (User $manager) => $this->notifications->notify(
                    $manager,
                    NotificationKind::System,
                    'گزارش تایید‌شده تیم',
                    "گزارش {$report->team->name} برای بررسی مدیریت ارسال شد.",
                    '/team-reports',
                ));

            return $report->fresh(['team', 'submitter', 'approver', 'forwarder']);
        });
    }
}
