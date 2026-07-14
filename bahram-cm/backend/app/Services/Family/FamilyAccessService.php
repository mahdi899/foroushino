<?php

namespace App\Services\Family;

use App\Models\FamilyMembership;
use App\Models\User;

class FamilyAccessService
{
    public function homeMembership(User $user): ?FamilyMembership
    {
        return FamilyMembership::query()
            ->with('family')
            ->where('user_id', $user->id)
            ->first();
    }

    public function requireMembership(User $user): FamilyMembership
    {
        $membership = $this->homeMembership($user);

        if (! $membership) {
            abort(403, 'شما عضو خانواده نیستید.');
        }

        return $membership;
    }

    public function canManage(User $user, string $permission = 'family.manage'): bool
    {
        return $user->is_admin && $user->hasPermission($permission);
    }
}
