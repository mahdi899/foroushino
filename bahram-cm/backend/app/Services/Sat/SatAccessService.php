<?php

namespace App\Services\Sat;

use App\Enums\SatRoleName;
use App\Models\SatLead;
use App\Models\User;
use App\Support\SatPermissionCatalog;
use Illuminate\Database\Eloquent\Builder;

class SatAccessService
{
    public function isSatStaff(User $user): bool
    {
        return (bool) $user->is_sat_staff;
    }

    public function isSatSuperAdmin(User $user): bool
    {
        return $this->isSatStaff($user)
            && $user->hasRole(SatRoleName::SuperAdmin->value, SatPermissionCatalog::GUARD);
    }

    public function hasSatPermission(User $user, string $permission): bool
    {
        if (! $this->isSatStaff($user)) {
            return false;
        }

        if ($this->isSatSuperAdmin($user)) {
            return true;
        }

        return $user->hasPermissionTo($permission, SatPermissionCatalog::GUARD);
    }

    /** @return list<int> */
    public function teamMemberIds(User $leader): array
    {
        return User::query()
            ->where('sat_leader_id', $leader->id)
            ->where('is_sat_staff', true)
            ->pluck('id')
            ->all();
    }

    /** @param Builder<\Illuminate\Database\Eloquent\Model> $query */
    public function scopeByStaffColumn(Builder $query, User $viewer, string $staffColumn = 'staff_id'): void
    {
        if ($this->hasSatPermission($viewer, 'sat.leads.view_all')
            || $this->hasSatPermission($viewer, 'sat.calls.view_all')
            || $this->hasSatPermission($viewer, 'sat.activities.view_all')) {
            return;
        }

        if ($this->hasSatPermission($viewer, 'sat.leads.view_team')
            || $this->hasSatPermission($viewer, 'sat.calls.view_team')
            || $this->hasSatPermission($viewer, 'sat.activities.view_team')) {
            $teamIds = array_merge([$viewer->id], $this->teamMemberIds($viewer));
            $query->whereIn($staffColumn, $teamIds);

            return;
        }

        $query->where($staffColumn, $viewer->id);
    }

    /** @param Builder<SatLead> $query */
    public function scopeLeadsFor(User $viewer, Builder $query): void
    {
        if ($this->hasSatPermission($viewer, 'sat.leads.view_all')) {
            return;
        }

        if ($this->hasSatPermission($viewer, 'sat.leads.view_team')) {
            $teamIds = array_merge([$viewer->id], $this->teamMemberIds($viewer));
            $query->whereIn('assigned_to', $teamIds);

            return;
        }

        $query->where('assigned_to', $viewer->id);
    }

    public function canManageStaff(User $actor, User $target): bool
    {
        if ($this->isSatSuperAdmin($actor)) {
            return true;
        }

        if (! $this->hasSatPermission($actor, 'sat.staff.manage')) {
            return false;
        }

        $actorRole = $this->primaryRole($actor);
        $targetRole = $this->primaryRole($target);

        if ($actorRole === null || $targetRole === null) {
            return false;
        }

        return $actorRole->rank() > $targetRole->rank();
    }

    public function canAssignRole(User $actor, SatRoleName $role): bool
    {
        if ($this->isSatSuperAdmin($actor)) {
            return true;
        }

        return match ($role) {
            SatRoleName::Specialist => $this->hasSatPermission($actor, 'sat.staff.create_specialist'),
            SatRoleName::Leader => $this->hasSatPermission($actor, 'sat.staff.create_leader'),
            default => false,
        };
    }

    public function primaryRole(User $user): ?SatRoleName
    {
        foreach ([
            SatRoleName::SuperAdmin,
            SatRoleName::Management,
            SatRoleName::Leader,
            SatRoleName::Specialist,
        ] as $role) {
            if ($user->hasRole($role->value, SatPermissionCatalog::GUARD)) {
                return $role;
            }
        }

        return null;
    }
}
