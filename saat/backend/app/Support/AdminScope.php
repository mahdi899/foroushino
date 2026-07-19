<?php

namespace App\Support;

use App\Enums\RoleName;
use App\Models\Team;
use App\Models\User;

/** Authorization helpers for admin user/team management APIs. */
final class AdminScope
{
    public static function canManageTeam(User $actor, Team $team): bool
    {
        if (TeamScope::isOrgWide($actor)) {
            return true;
        }

        if (! $actor->hasRole(RoleName::Supervisor->value)) {
            return false;
        }

        if ($team->supervisor_id !== null) {
            return (int) $team->supervisor_id === (int) $actor->id;
        }

        return $actor->team_id !== null && (int) $team->id === (int) $actor->team_id;
    }

    public static function canCreateTeam(User $actor): bool
    {
        if (! $actor->can('teams.manage')) {
            return false;
        }

        if (TeamScope::isOrgWide($actor)) {
            return true;
        }

        if ($actor->hasRole(RoleName::Supervisor->value)) {
            return SupervisorCapacity::hasRoomForTeam((int) $actor->id);
        }

        return false;
    }

    public static function canCreateRole(User $actor, string $role): bool
    {
        return match ($role) {
            RoleName::SuperAdmin->value => $actor->hasRole(RoleName::SuperAdmin->value) && $actor->can('users.manage'),
            RoleName::Admin->value, RoleName::Manager->value => TeamScope::isOrgWide($actor) && $actor->can('users.manage'),
            RoleName::Supervisor->value => (bool) $actor->can('users.manage'),
            RoleName::Leader->value => $actor->can('users.manage') || $actor->can('users.manage-team'),
            RoleName::Agent->value => $actor->can('users.manage-team') || $actor->can('users.manage'),
            default => false,
        };
    }

    public static function canManageUser(User $actor, User $target): bool
    {
        if ($actor->can('users.manage')) {
            return true;
        }

        if ($actor->hasRole(RoleName::Leader->value) && $actor->can('users.manage-team-roster')) {
            if (! $target->hasRole(RoleName::Agent->value)) {
                return false;
            }

            $teamIds = TeamScope::supervisedTeamIds($actor);

            return $target->team_id === null
                || in_array((int) $target->team_id, $teamIds, true);
        }

        if (! $actor->can('users.manage-team') && ! $actor->can('users.manage-team-roster')) {
            return false;
        }

        if ($target->hasAnyRole([
            RoleName::Manager->value,
            RoleName::Admin->value,
            RoleName::SuperAdmin->value,
            RoleName::Supervisor->value,
        ])) {
            return false;
        }

        $supervisedTeamIds = TeamScope::supervisedTeamIds($actor);
        if ($supervisedTeamIds === []) {
            return false;
        }

        if ($target->team_id && in_array((int) $target->team_id, $supervisedTeamIds, true)) {
            return true;
        }

        $ledTeamId = Team::query()->where('leader_id', $target->id)->value('id');

        return $ledTeamId && in_array((int) $ledTeamId, $supervisedTeamIds, true);
    }

    public static function canManageTeamRoster(User $actor, int $teamId): bool
    {
        if ($actor->can('users.manage') || $actor->can('users.manage-team')) {
            $team = Team::query()->find($teamId);

            return $team ? self::canManageTeam($actor, $team) : TeamScope::isOrgWide($actor);
        }

        if (! $actor->hasRole(RoleName::Leader->value) || ! $actor->can('users.manage-team-roster')) {
            return false;
        }

        return (int) $actor->team_id === $teamId
            || Team::query()->whereKey($teamId)->where('leader_id', $actor->id)->exists();
    }

    public static function assertTeamInScope(User $actor, int $teamId): void
    {
        if (TeamScope::isOrgWide($actor)) {
            return;
        }

        $team = Team::query()->findOrFail($teamId);
        abort_unless(self::canManageTeam($actor, $team), 403, 'اجازه مدیریت این تیم را ندارید.');
    }

    public static function resolveSupervisorIdForTeamCreate(User $actor, ?int $requestedSupervisorId): int
    {
        if (TeamScope::isOrgWide($actor)) {
            abort_unless($requestedSupervisorId, 422, 'ناظر مسئول تیم را مشخص کن.');

            $supervisor = User::query()->findOrFail($requestedSupervisorId);
            abort_unless($supervisor->hasRole(RoleName::Supervisor->value), 422, 'کاربر انتخاب‌شده ناظر نیست.');
            abort_unless(
                SupervisorCapacity::hasRoomForTeam((int) $supervisor->id),
                422,
                'این ناظر به سقف '.SupervisorCapacity::TEAMS_PER_SUPERVISOR.' تیم رسیده است.',
            );

            return (int) $supervisor->id;
        }

        abort_unless($actor->hasRole(RoleName::Supervisor->value), 403);
        abort_unless(
            SupervisorCapacity::hasRoomForTeam((int) $actor->id),
            422,
            'شما به سقف '.SupervisorCapacity::TEAMS_PER_SUPERVISOR.' تیم رسیده‌اید.',
        );

        return (int) $actor->id;
    }
}
