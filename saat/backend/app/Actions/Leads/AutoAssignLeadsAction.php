<?php

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Events\LeadAssigned;
use App\Models\Lead;
use App\Models\LeadStatusHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Spreads currently unassigned, cycle-eligible leads evenly across active
 * agents (round-robin), optionally scoped to a single team. Used by
 * managers/supervisors to bulk-distribute a fresh batch of leads instead of
 * relying only on the agent-pull `getNextLeadForAgent` flow.
 */
class AutoAssignLeadsAction
{
    /**
     * @return array{assigned: int, agents: int}
     */
    public function execute(User $actor, int $limit = 200, ?int $teamId = null): array
    {
        $agentsQuery = User::query()->role('agent')->where('is_active', true);
        if ($teamId) {
            $agentsQuery->where('team_id', $teamId);
        }
        $agents = $agentsQuery->orderBy('id')->get();

        if ($agents->isEmpty()) {
            return ['assigned' => 0, 'agents' => 0];
        }

        $leadsQuery = Lead::query()
            ->unassigned()
            ->eligibleForCycle()
            ->whereNull('do_not_call_at');

        if ($teamId) {
            $leadsQuery->where(function ($q) use ($teamId): void {
                $q->whereNull('assigned_team_id')->orWhere('assigned_team_id', $teamId);
            });
        }

        $leads = $leadsQuery->orderBy('created_at')->limit($limit)->get();

        $assigned = 0;
        $agentCount = $agents->count();

        DB::transaction(function () use ($leads, $agents, $agentCount, $actor, &$assigned): void {
            foreach ($leads as $index => $lead) {
                /** @var User $agent */
                $agent = $agents[$index % $agentCount];

                $lead->assigned_agent_id = $agent->id;
                $lead->assigned_team_id = $agent->team_id;
                $lead->status = LeadStatus::Assigned;
                $lead->save();

                LeadStatusHistory::query()->create([
                    'lead_id' => $lead->id,
                    'status' => LeadStatus::Assigned,
                    'by_user_id' => $actor->id,
                    'note' => 'تخصیص خودکار توسط '.$actor->name,
                ]);

                broadcast(new LeadAssigned($lead->fresh()))->toOthers();

                $assigned++;
            }
        });

        return ['assigned' => $assigned, 'agents' => $agentCount];
    }
}
