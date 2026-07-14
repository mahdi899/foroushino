<?php

namespace App\Support;

use App\Enums\RoleName;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/** Resolves whether a user sees one team or the whole org. */
final class TeamScope
{
    public static function isOrgWide(User $user): bool
    {
        return $user->hasAnyRole([
            RoleName::Manager->value,
            RoleName::Admin->value,
        ]);
    }

    /** True for leader/supervisor bound to a single team colony. */
    public static function isTeamColony(User $user): bool
    {
        return $user->hasAnyRole([
            RoleName::Leader->value,
            RoleName::Supervisor->value,
        ]) && $user->team_id !== null;
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

    /** Active agent ids belonging to the user's team colony. */
    public static function teamAgentIds(?int $teamId): array
    {
        if (! $teamId) {
            return [];
        }

        return User::query()
            ->role(RoleName::Agent->value)
            ->where('team_id', $teamId)
            ->where('is_active', true)
            ->pluck('id')
            ->all();
    }

    /**
     * Restricts lead list queries to what the user may see (index/sync).
     */
    public static function applyLeadQueryScope(Builder $query, User $user): void
    {
        if (self::isOrgWide($user)) {
            return;
        }

        if (self::isTeamColony($user)) {
            $teamId = (int) $user->team_id;
            $agentIds = self::teamAgentIds($teamId);

            $query->where(function ($q) use ($teamId, $agentIds): void {
                $q->where('assigned_team_id', $teamId);
                if ($agentIds !== []) {
                    $q->orWhereIn('assigned_agent_id', $agentIds);
                }
            });

            return;
        }

        $query->where('assigned_agent_id', $user->id);
    }

    public static function applyFollowUpQueryScope(Builder $query, User $user): void
    {
        if (self::isOrgWide($user)) {
            return;
        }

        if (self::isTeamColony($user)) {
            $agentIds = self::teamAgentIds((int) $user->team_id);
            if ($agentIds === []) {
                $query->whereRaw('0 = 1');

                return;
            }
            $query->whereIn('agent_id', $agentIds);

            return;
        }

        $query->where('agent_id', $user->id);
    }

    public static function applySaleQueryScope(Builder $query, User $user): void
    {
        if (self::isOrgWide($user)) {
            return;
        }

        if (self::isTeamColony($user) && $user->team_id) {
            $query->where('team_id', $user->team_id);

            return;
        }

        $query->where('agent_id', $user->id);
    }

    public static function leaderCanViewLead(User $user, Lead $lead): bool
    {
        return self::teamColonyCanViewLead($user, $lead);
    }

    public static function supervisorCanViewLead(User $user, Lead $lead): bool
    {
        return self::teamColonyCanViewLead($user, $lead);
    }

    private static function teamColonyCanViewLead(User $user, Lead $lead): bool
    {
        if (! $user->team_id) {
            return false;
        }

        $teamId = (int) $user->team_id;

        if ($lead->assigned_team_id === $teamId) {
            return true;
        }

        if ($lead->assigned_agent_id) {
            return User::query()
                ->whereKey($lead->assigned_agent_id)
                ->where('team_id', $teamId)
                ->exists();
        }

        return false;
    }
}
