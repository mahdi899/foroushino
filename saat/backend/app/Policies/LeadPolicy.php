<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Lead;
use App\Models\User;
use App\Support\LeadFairAssignment;
use App\Support\TeamScope;

class LeadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('leads.view') || $user->can('leads.view-team');
    }

    public function view(User $user, Lead $lead): bool
    {
        if (TeamScope::isOrgWide($user)) {
            return true;
        }

        if ($user->hasRole(RoleName::Leader->value)) {
            return TeamScope::leaderCanViewLead($user, $lead);
        }

        if ($user->hasRole(RoleName::Supervisor->value)) {
            return TeamScope::supervisorCanViewLead($user, $lead);
        }

        return $lead->assigned_agent_id === $user->id;
    }

    public function update(User $user, Lead $lead): bool
    {
        return $this->view($user, $lead);
    }

    public function lock(User $user, Lead $lead): bool
    {
        if ($lead->assigned_agent_id !== null && $lead->assigned_agent_id !== $user->id) {
            return $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value]);
        }

        if ($lead->assigned_agent_id === null && $user->hasRole(RoleName::Agent->value)) {
            return app(LeadFairAssignment::class)->canPullFromPool(
                $user,
                $lead->assigned_team_id ? (int) $lead->assigned_team_id : null,
            );
        }

        return true;
    }

    public function reassign(User $user, Lead $lead): bool
    {
        return $user->can('leads.reassign');
    }

    public function reclaim(User $user, Lead $lead): bool
    {
        return $lead->returned_to_pool && $user->can('leads.view');
    }
}
