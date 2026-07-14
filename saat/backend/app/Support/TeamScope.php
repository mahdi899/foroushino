<?php

namespace App\Support;

use App\Enums\RoleName;
use App\Models\Lead;
use App\Models\User;

/** Resolves whether a user sees one team or the whole org. */
final class TeamScope
{
    public static function isOrgWide(User $user): bool
    {
        return $user->hasAnyRole([
            RoleName::Manager->value,
            RoleName::Admin->value,
            RoleName::Supervisor->value,
        ]);
    }

    /** `null` = all teams; otherwise filter by this team id. */
    public static function teamIdForQueries(User $user): ?int
    {
        return self::isOrgWide($user) ? null : $user->team_id;
    }

    public static function canPickTeam(User $user): bool
    {
        return self::isOrgWide($user);
    }

    /**
     * Restricts lead list queries to what the user may see (index/sync).
     */
    public static function applyLeadQueryScope(\Illuminate\Database\Eloquent\Builder $query, User $user): void
    {
        if (self::isOrgWide($user)) {
            return;
        }

        if ($user->hasRole(RoleName::Leader->value)) {
            $teamId = $user->team_id;
            if (! $teamId) {
                $query->whereRaw('0 = 1');

                return;
            }

            $query->where(function ($q) use ($teamId): void {
                $q->where('assigned_team_id', $teamId)
                    ->orWhereIn('assigned_agent_id', User::query()->where('team_id', $teamId)->select('id'));
            });

            return;
        }

        $query->where('assigned_agent_id', $user->id);
    }

    public static function leaderCanViewLead(User $user, Lead $lead): bool
    {
        if (! $user->hasRole(RoleName::Leader->value) || ! $user->team_id) {
            return false;
        }

        if ($lead->assigned_team_id === $user->team_id) {
            return true;
        }

        if ($lead->assigned_agent_id) {
            return User::query()
                ->whereKey($lead->assigned_agent_id)
                ->where('team_id', $user->team_id)
                ->exists();
        }

        return false;
    }
}
