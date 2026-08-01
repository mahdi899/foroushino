<?php

namespace App\Services\Family;

use App\Models\FamilyMembership;
use App\Models\User;

class FamilyAccessService
{
    /** @var array<int, FamilyMembership|null> */
    private array $homeMembershipMemo = [];

    public function homeMembership(User $user): ?FamilyMembership
    {
        if (array_key_exists($user->id, $this->homeMembershipMemo)) {
            return $this->homeMembershipMemo[$user->id];
        }

        $this->homeMembershipMemo[$user->id] = FamilyMembership::query()
            ->with('family')
            ->where('user_id', $user->id)
            ->first();

        return $this->homeMembershipMemo[$user->id];
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
