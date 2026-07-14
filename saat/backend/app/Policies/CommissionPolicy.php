<?php

namespace App\Policies;

use App\Enums\CommissionStatus;
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

    public function approveAsLeader(User $user, Commission $commission): bool
    {
        if (! $user->can('commissions.approve-leader')) {
            return false;
        }

        if ($commission->status !== CommissionStatus::Pending) {
            return false;
        }

        return (int) $commission->agent?->team_id === (int) $user->team_id;
    }

    public function approveAsSupervisor(User $user, Commission $commission): bool
    {
        if (! $user->can('commissions.approve-supervisor')) {
            return false;
        }

        return $commission->status === CommissionStatus::Approved;
    }

    public function reject(User $user, Commission $commission): bool
    {
        if ($user->can('commissions.approve-supervisor') && $commission->status === CommissionStatus::Approved) {
            return true;
        }

        return $user->can('commissions.approve-leader')
            && $commission->status === CommissionStatus::Pending
            && (int) $commission->agent?->team_id === (int) $user->team_id;
    }
}
