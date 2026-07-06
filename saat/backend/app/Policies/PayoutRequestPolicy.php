<?php

namespace App\Policies;

use App\Models\PayoutRequest;
use App\Models\User;

class PayoutRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('wallet.view');
    }

    public function view(User $user, PayoutRequest $payoutRequest): bool
    {
        return $payoutRequest->user_id === $user->id || $user->can('wallet.manage-payouts');
    }

    public function process(User $user, PayoutRequest $payoutRequest): bool
    {
        return $user->can('wallet.manage-payouts');
    }
}
