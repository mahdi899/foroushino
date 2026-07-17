<?php

namespace App\Support;

use App\Enums\RoleName;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Ensures unassigned pool leads are only claimed by agents with the lightest
 * current workload in the relevant team scope, so one specialist cannot hoard
 * the entire queue while teammates sit idle.
 */
final class LeadFairAssignment
{
    /**
     * @return Collection<int, User>
     */
    public function eligibleAgents(?int $teamId): Collection
    {
        $query = User::query()
            ->role(RoleName::Agent->value)
            ->where('is_active', true);

        if ($teamId !== null) {
            $query->where('team_id', $teamId);
        }

        return $query->orderBy('id')->get();
    }

    public function workload(int $agentId): int
    {
        return Lead::query()
            ->where('assigned_agent_id', $agentId)
            ->eligibleForCycle()
            ->whereNull('do_not_call_at')
            ->count();
    }

    /**
     * @return list<int>
     */
    public function agentIdsWithMinWorkload(?int $teamId): array
    {
        $agents = $this->eligibleAgents($teamId);

        if ($agents->isEmpty()) {
            return [];
        }

        $loads = $agents->map(fn (User $agent) => $this->workload($agent->id));
        $min = $loads->min();

        return $agents
            ->filter(fn (User $agent, int $index) => $loads[$index] === $min)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public function canPullFromPool(User $agent, ?int $leadTeamId = null): bool
    {
        if (! $agent->hasRole(RoleName::Agent->value)) {
            return false;
        }

        $scopeTeamId = $leadTeamId ?? ($agent->team_id ? (int) $agent->team_id : null);
        $eligible = $this->agentIdsWithMinWorkload($scopeTeamId);

        if ($eligible === []) {
            return true;
        }

        return in_array((int) $agent->id, $eligible, true);
    }
}
