<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Sale;
use App\Models\User;
use App\Support\TeamScope;

class SalePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('sales.view');
    }

    public function view(User $user, Sale $sale): bool
    {
        if (TeamScope::isOrgWide($user)) {
            return true;
        }

        if ($user->hasAnyRole([RoleName::Leader->value, RoleName::Supervisor->value])) {
            return $user->team_id !== null && $sale->team_id === $user->team_id;
        }

        return $sale->agent_id === $user->id;
    }

    public function submitPayment(User $user, Sale $sale): bool
    {
        if ($sale->agent_id === $user->id) {
            return $user->can('sales.manage');
        }

        return $user->can('sales.register-payment') && $this->view($user, $sale);
    }

    public function cancel(User $user, Sale $sale): bool
    {
        return $sale->agent_id === $user->id;
    }

    public function confirm(User $user, Sale $sale): bool
    {
        return $user->can('sales.confirm');
    }

    public function forwardForConfirmation(User $user, Sale $sale): bool
    {
        if (! $user->can('sales.review-payment')) {
            return false;
        }

        if (TeamScope::isOrgWide($user)) {
            return true;
        }

        return $sale->team_id === $user->team_id;
    }
}
