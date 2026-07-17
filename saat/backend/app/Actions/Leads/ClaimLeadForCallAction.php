<?php

namespace App\Actions\Leads;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\LeadStatusHistory;
use App\Models\User;
use App\Support\LeadFairAssignment;

class ClaimLeadForCallAction
{
    public function __construct(
        private readonly LeadFairAssignment $fairAssignment,
    ) {}

    public function execute(User $agent, Lead $lead): Lead
    {
        if ($lead->assigned_agent_id === $agent->id) {
            return $lead;
        }

        if ($lead->assigned_agent_id !== null && $lead->assigned_agent_id !== $agent->id) {
            abort(403, 'این مشتری به کارشناس دیگری اختصاص داده شده است.');
        }

        if (! $this->agentCanClaimFromPool($agent, $lead)) {
            abort(403, 'شما به این مشتری دسترسی ندارید. ابتدا از صف تماس بعدی استفاده کن.');
        }

        if (! $this->fairAssignment->canPullFromPool($agent, $lead->assigned_team_id ? (int) $lead->assigned_team_id : null)) {
            abort(403, 'این مشتری باید بین کارشناسان به‌صورت عادلانه تقسیم شود. فعلاً نوبت هم‌تیمی‌های کم‌بارتر است.');
        }

        $lead->assigned_agent_id = $agent->id;
        $lead->assigned_team_id = $lead->assigned_team_id ?? $agent->team_id;
        $lead->returned_to_pool = false;

        if (in_array($lead->status, [LeadStatus::New, LeadStatus::Assigned, LeadStatus::ReturnedToPool], true)) {
            $lead->status = LeadStatus::Queued;
        }

        $lead->save();

        LeadStatusHistory::query()->create([
            'lead_id' => $lead->id,
            'status' => $lead->status,
            'by_user_id' => $agent->id,
            'note' => 'اختصاص خودکار هنگام شروع تماس',
        ]);

        return $lead->fresh();
    }

    private function agentCanClaimFromPool(User $agent, Lead $lead): bool
    {
        if (! $agent->can('calls.manage')) {
            return false;
        }

        if ($lead->do_not_call_at !== null) {
            return false;
        }

        if ($lead->assigned_team_id !== null && $agent->team_id !== null) {
            return (int) $lead->assigned_team_id === (int) $agent->team_id;
        }

        if ($lead->assigned_team_id === null) {
            return true;
        }

        return $agent->team_id === null;
    }
}
