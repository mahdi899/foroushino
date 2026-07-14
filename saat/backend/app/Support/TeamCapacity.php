<?php

namespace App\Support;

use App\Enums\RoleName;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Collection;

class TeamCapacity
{
    public const AGENTS_PER_TEAM = 15;

    public static function activeAgentCount(int $teamId, ?int $exceptUserId = null): int
    {
        return User::query()
            ->role(RoleName::Agent->value)
            ->where('team_id', $teamId)
            ->where('is_active', true)
            ->when($exceptUserId, fn ($query) => $query->where('id', '!=', $exceptUserId))
            ->count();
    }

    public static function hasRoomForAgent(int $teamId, ?int $exceptUserId = null): bool
    {
        return self::activeAgentCount($teamId, $exceptUserId) < self::AGENTS_PER_TEAM;
    }

    /** Keep at most {@see AGENTS_PER_TEAM} active agents per team; deactivate the rest. */
    public static function enforceForTeam(int $teamId): int
    {
        $agents = User::query()
            ->role(RoleName::Agent->value)
            ->where('team_id', $teamId)
            ->where('is_active', true)
            ->get();

        if ($agents->count() <= self::AGENTS_PER_TEAM) {
            return 0;
        }

        $keepers = self::rankAgentsForRetention($agents)->take(self::AGENTS_PER_TEAM);
        $keeperIds = $keepers->pluck('id')->all();

        return User::query()
            ->whereIn('id', $agents->pluck('id'))
            ->whereNotIn('id', $keeperIds)
            ->update(['is_active' => false]);
    }

    public static function enforceForAllTeams(): int
    {
        $deactivated = 0;
        foreach (Team::query()->pluck('id') as $teamId) {
            $deactivated += self::enforceForTeam((int) $teamId);
        }

        return $deactivated;
    }

    /**
     * @param  Collection<int, User>  $agents
     * @return Collection<int, User>
     */
    private static function rankAgentsForRetention(Collection $agents): Collection
    {
        return $agents
            ->sortBy([
                fn (User $agent) => self::canonicalSlot($agent->email) ?? 999,
                fn (User $agent) => $agent->id,
            ])
            ->values();
    }

    /** agent{team}-{slot}@saat.local → slot number for retention priority. */
    private static function canonicalSlot(string $email): ?int
    {
        if (preg_match('/^agent\d+-(\d+)@saat\.local$/', $email, $matches) !== 1) {
            return null;
        }

        return (int) $matches[1];
    }
}
