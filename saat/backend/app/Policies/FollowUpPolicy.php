<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\FollowUp;
use App\Models\User;
use App\Support\TeamScope;

class FollowUpPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('followups.view');
    }

    public function view(User $user, FollowUp $followUp): bool
    {
        if (TeamScope::isOrgWide($user)) {
            return true;
        }

        if ($user->hasAnyRole([RoleName::Leader->value, RoleName::Supervisor->value])) {
            if (! $user->team_id) {
                return false;
            }

            return User::query()
                ->whereKey($followUp->agent_id)
                ->where('team_id', $user->team_id)
                ->exists();
        }

        return $followUp->agent_id === $user->id;
    }

    public function update(User $user, FollowUp $followUp): bool
    {
        return $followUp->agent_id === $user->id;
    }
}
