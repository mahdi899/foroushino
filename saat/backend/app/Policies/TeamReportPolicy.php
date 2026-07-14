<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Enums\TeamReportStatus;
use App\Models\TeamReport;
use App\Models\User;

class TeamReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reports.view');
    }

    public function view(User $user, TeamReport $report): bool
    {
        if (! $user->can('reports.view')) {
            return false;
        }

        if ($user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value])) {
            return true;
        }

        if ($user->hasRole(RoleName::Leader->value)) {
            return $report->team?->leader_id === $user->id;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('reports.submit-team');
    }

    public function approve(User $user, TeamReport $report): bool
    {
        return $user->can('reports.approve-team')
            && $report->status === TeamReportStatus::Submitted;
    }

    public function forward(User $user, TeamReport $report): bool
    {
        return $user->can('reports.approve-team')
            && $report->status === TeamReportStatus::Approved;
    }
}
