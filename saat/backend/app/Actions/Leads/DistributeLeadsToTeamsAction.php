<?php

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\LeadStatusHistory;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Round-robin distribution of fresh unassigned leads across teams.
 * Sets assigned_team_id and leaves assigned_agent_id null so team agents
 * pull leads from their team pool via AssignNextLeadAction.
 */
class DistributeLeadsToTeamsAction
{
    /**
     * @param  list<int>|null  $teamIds
     * @return array{distributed: int, teams: int}
     */
    public function execute(User $actor, int $limit = 200, ?array $teamIds = null): array
    {
        $teamsQuery = Team::query()->orderBy('id');
        if ($teamIds !== null && $teamIds !== []) {
            $teamsQuery->whereIn('id', $teamIds);
        }
        $teams = $teamsQuery->get();

        if ($teams->isEmpty()) {
            return ['distributed' => 0, 'teams' => 0];
        }

        $leads = Lead::query()
            ->whereNull('assigned_agent_id')
            ->whereNull('assigned_team_id')
            ->eligibleForCycle()
            ->whereNull('do_not_call_at')
            ->whereIn('status', [LeadStatus::New->value, LeadStatus::Assigned->value])
            ->orderBy('created_at')
            ->limit($limit)
            ->get();

        $distributed = 0;
        $teamCount = $teams->count();

        DB::transaction(function () use ($leads, $teams, $teamCount, $actor, &$distributed): void {
            foreach ($leads as $index => $lead) {
                /** @var Team $team */
                $team = $teams[$index % $teamCount];

                $lead->assigned_team_id = $team->id;
                $lead->status = LeadStatus::Assigned;
                $lead->save();

                LeadStatusHistory::query()->create([
                    'lead_id' => $lead->id,
                    'status' => LeadStatus::Assigned,
                    'by_user_id' => $actor->id,
                    'note' => 'تقسیم به تیم '.$team->name,
                ]);

                $distributed++;
            }
        });

        return ['distributed' => $distributed, 'teams' => $teamCount];
    }
}
