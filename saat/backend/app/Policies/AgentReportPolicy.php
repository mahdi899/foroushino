<?php

namespace App\Policies;

use App\Enums\AgentReportStatus;
use App\Enums\RoleName;
use App\Models\AgentReport;
use App\Models\User;

class AgentReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reports.submit-agent')
            || $user->can('reports.approve-agent')
            || $user->can('reports.view-all');
    }

    public function view(User $user, AgentReport $report): bool
    {
        if ($user->can('reports.view-all')) {
            return true;
        }

        if ($user->can('reports.approve-agent') && $user->hasRole(RoleName::Leader->value)) {
            return $report->team?->leader_id === $user->id;
        }

        if ($user->can('reports.submit-agent')) {
            return $report->agent_id === $user->id;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->can('reports.submit-agent');
    }

    public function approve(User $user, AgentReport $report): bool
    {
        return $user->can('reports.approve-agent')
            && $report->team?->leader_id === $user->id
            && $report->status === AgentReportStatus::Submitted;
    }

    public function reject(User $user, AgentReport $report): bool
    {
        return $user->can('reports.approve-agent')
            && $report->team?->leader_id === $user->id
            && $report->status === AgentReportStatus::Submitted;
    }
}
