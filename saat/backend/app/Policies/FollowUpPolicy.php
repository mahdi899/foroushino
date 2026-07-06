<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\FollowUp;
use App\Models\User;

class FollowUpPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('followups.view');
    }

    public function view(User $user, FollowUp $followUp): bool
    {
        if ($user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value, RoleName::Leader->value])) {
            return true;
        }

        return $followUp->agent_id === $user->id;
    }

    public function update(User $user, FollowUp $followUp): bool
    {
        return $followUp->agent_id === $user->id;
    }
}
