<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Sale;
use App\Models\User;

class SalePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('sales.view');
    }

    public function view(User $user, Sale $sale): bool
    {
        if ($user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value])) {
            return true;
        }

        if ($user->hasAnyRole([RoleName::Supervisor->value, RoleName::Leader->value])) {
            return $sale->team_id === $user->team_id;
        }

        return $sale->agent_id === $user->id;
    }

    public function submitPayment(User $user, Sale $sale): bool
    {
        return $sale->agent_id === $user->id;
    }

    public function cancel(User $user, Sale $sale): bool
    {
        return $sale->agent_id === $user->id;
    }

    public function confirm(User $user, Sale $sale): bool
    {
        return $user->can('sales.confirm');
    }
}
