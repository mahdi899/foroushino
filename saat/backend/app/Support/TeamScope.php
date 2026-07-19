<?php

namespace App\Support;

use App\Enums\RoleName;
use App\Models\Lead;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/** Resolves whether a user sees one team or the whole org. */
final class TeamScope
{
    /** @var array<int, list<int>> */
    private static array $supervisedTeamIdsCache = [];

    public static function isOrgWide(User $user): bool
    {
        return $user->hasAnyRole([
            RoleName::Manager->value,
            RoleName::Admin->value,
            RoleName::SuperAdmin->value,
        ]);
    }

    /** True for leader/supervisor bound to at least one team colony. */
    public static function isTeamColony(User $user): bool
    {
        if (! $user->hasAnyRole([RoleName::Leader->value, RoleName::Supervisor->value])) {
            return false;
        }

        return self::supervisedTeamIds($user) !== [] || $user->team_id !== null;
    }

    /** `null` = all teams; otherwise filter by this team id (legacy single-team callers). */
    public static function teamIdForQueries(User $user): ?int
    {
        if (self::isOrgWide($user)) {
            return null;
        }

        $teamIds = self::supervisedTeamIds($user);

        return $teamIds[0] ?? $user->team_id;
    }

    /**
     * Team ids a leader/supervisor may operate on. Empty for org-wide managers.
     *
     * @return list<int>
     */
    public static function supervisedTeamIds(User $user): array
    {
        $cacheKey = (int) $user->id;
        if (array_key_exists($cacheKey, self::$supervisedTeamIdsCache)) {
            return self::$supervisedTeamIdsCache[$cacheKey];
        }

        if (self::isOrgWide($user)) {
            return self::$supervisedTeamIdsCache[$cacheKey] = [];
        }

        if ($user->hasRole(RoleName::Supervisor->value)) {
            $ids = Team::query()
                ->where('supervisor_id', $user->id)
                ->orderBy('id')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($ids !== []) {
                return self::$supervisedTeamIdsCache[$cacheKey] = $ids;
            }

            return self::$supervisedTeamIdsCache[$cacheKey] = $user->team_id ? [(int) $user->team_id] : [];
        }

        if ($user->hasRole(RoleName::Leader->value)) {
            $ledTeamId = Team::query()->where('leader_id', $user->id)->value('id');
            if ($ledTeamId) {
                return self::$supervisedTeamIdsCache[$cacheKey] = [(int) $ledTeamId];
            }

            return self::$supervisedTeamIdsCache[$cacheKey] = $user->team_id ? [(int) $user->team_id] : [];
        }

        return self::$supervisedTeamIdsCache[$cacheKey] = [];
    }

    public static function canPickTeam(User $user): bool
    {
        return self::isOrgWide($user) || count(self::supervisedTeamIds($user)) > 1;
    }

    /** Active agent ids belonging to one team. */
    public static function teamAgentIds(?int $teamId): array
    {
        return self::teamAgentIdsForTeams($teamId ? [$teamId] : []);
    }

    /**
     * @param  list<int>  $teamIds
     * @return list<int>
     */
    public static function teamAgentIdsForTeams(array $teamIds): array
    {
        if ($teamIds === []) {
            return [];
        }

        return User::query()
            ->role(RoleName::Agent->value)
            ->whereIn('team_id', $teamIds)
            ->where('is_active', true)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
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

        $teamIds = self::supervisedTeamIds($user);
        if ($teamIds !== []) {
            $agentIds = self::teamAgentIdsForTeams($teamIds);

            $query->where(function ($q) use ($teamIds, $agentIds): void {
                $q->whereIn('assigned_team_id', $teamIds);
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

        $teamIds = self::supervisedTeamIds($user);
        if ($teamIds !== []) {
            $agentIds = self::teamAgentIdsForTeams($teamIds);
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

        $teamIds = self::supervisedTeamIds($user);
        if ($teamIds !== []) {
            $query->whereIn('team_id', $teamIds);

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
        $teamIds = self::supervisedTeamIds($user);
        if ($teamIds === []) {
            return false;
        }

        if ($lead->assigned_team_id && in_array((int) $lead->assigned_team_id, $teamIds, true)) {
            return true;
        }

        if ($lead->assigned_agent_id) {
            return User::query()
                ->whereKey($lead->assigned_agent_id)
                ->whereIn('team_id', $teamIds)
                ->exists();
        }

        return false;
    }
}
