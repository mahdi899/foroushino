<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Commission;
use App\Models\User;

class CommissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('wallet.view');
    }

    public function view(User $user, Commission $commission): bool
    {
        if ($user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value, RoleName::Leader->value])) {
            return true;
        }

        return $commission->agent_id === $user->id;
    }
}
