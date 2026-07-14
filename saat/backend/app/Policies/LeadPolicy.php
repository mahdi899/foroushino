<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Lead;
use App\Models\User;
use App\Support\TeamScope;

class LeadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('leads.view');
    }

    public function view(User $user, Lead $lead): bool
    {
        if (TeamScope::isOrgWide($user)) {
            return true;
        }

        if ($user->hasRole(RoleName::Leader->value)) {
            return $lead->assigned_team_id === $user->team_id;
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
