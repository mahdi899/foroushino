<?php

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Enums\SuggestReason;
use App\Events\LeadAssigned;
use App\Models\Lead;
use App\Models\LeadStatusHistory;
use App\Models\User;
use App\Support\LeadPriorityScore;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Atomically selects and locks the single best next lead for an agent to call,
 * using the same priority heuristic as the frontend's suggestion engine
 * (overdue follow-up > today's follow-up > hot-in-window > interested needing
 * follow-up > fresh high-probability > warm > cold), computed directly in SQL
 * over an indexed candidate set, then locked with `FOR UPDATE SKIP LOCKED` so
 * concurrent agents never race for the same row.
 *
 * A short-lived Redis lock additionally serializes repeated/duplicate taps
 * from the same agent (e.g. a retried request) so they can't acquire two
 * different leads in quick succession.
 *
 * Uses plain `FOR UPDATE` (rather than `SKIP LOCKED`, unsupported on
 * MariaDB < 10.6) — with per-agent Redis locking and sub-second transactions,
 * brief blocking on a hot row is an acceptable trade-off for portability.
 */
class AssignNextLeadAction
{
    private const LOCK_MINUTES = 20;

    /**
     * @return array{lead: ?Lead, reason: ?SuggestReason}
     */
    public function execute(User $agent): array
    {
        $lock = Cache::lock("lead-assign:agent:{$agent->id}", 15);

        if (! $lock->block(5)) {
            throw new RuntimeException('در حال پردازش درخواست قبلی شما هستیم، لطفاً کمی صبر کنید.');
        }

        try {
            $result = DB::transaction(function () use ($agent) {
                $lead = $this->selectCandidate($agent);

                if (! $lead) {
                    return ['lead' => null, 'reason' => null];
                }

                $wasUnassigned = $lead->assigned_agent_id === null;

                $lead->assigned_agent_id = $agent->id;
                $lead->assigned_team_id = $lead->assigned_team_id ?? $agent->team_id;
                $lead->locked_by = $agent->id;
                $lead->locked_until = now()->addMinutes(self::LOCK_MINUTES);
                $lead->returned_to_pool = false;

                if (in_array($lead->status, [LeadStatus::New, LeadStatus::Assigned, LeadStatus::ReturnedToPool], true)) {
                    $lead->status = LeadStatus::Queued;
                }

                $lead->save();

                LeadStatusHistory::query()->create([
                    'lead_id' => $lead->id,
                    'status' => $lead->status,
                    'by_user_id' => $agent->id,
                    'note' => $wasUnassigned ? 'واگذاری خودکار از استخر لیدها' : 'قفل شد برای تماس بعدی',
                ]);

                return ['lead' => $lead, 'reason' => $this->reasonFor($lead)];
            });

            if ($result['lead']) {
                try {
                    broadcast(new LeadAssigned($result['lead']))->toOthers();
                } catch (BroadcastException $e) {
                    Log::warning('LeadAssigned broadcast skipped', [
                        'lead_id' => $result['lead']->id,
                        'agent_id' => $agent->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $result;
        } finally {
            $lock->release();
        }
    }

    private function selectCandidate(User $agent): ?Lead
    {
        $excluded = array_map(fn ($s) => $s->value, LeadStatus::excludedFromCycle());

        return Lead::query()
            ->whereNotIn('status', $excluded)
            ->whereNull('do_not_call_at')
            ->where(function ($q): void {
                $q->whereNull('locked_by')->orWhere('locked_until', '<', now());
            })
            ->where(function ($q) use ($agent): void {
                $q->where('assigned_agent_id', $agent->id)
                    ->orWhere(function ($q2) use ($agent): void {
                        $q2->whereNull('assigned_agent_id')
                            ->where(function ($q3) use ($agent): void {
                                if ($agent->team_id) {
                                    $q3->whereNull('assigned_team_id')
                                        ->orWhere('assigned_team_id', $agent->team_id);
                                } else {
                                    $q3->whereNull('assigned_team_id');
                                }
                            });
                    });
            })
            ->selectRaw('leads.*, ('.LeadPriorityScore::sqlExpression().') as priority_score')
            ->orderByDesc('priority_score')
            ->orderBy('id')
            ->limit(1)
            ->lockForUpdate()
            ->first();
    }

    private function reasonFor(Lead $lead): SuggestReason
    {
        return LeadPriorityScore::reasonFor($lead);
    }
}
