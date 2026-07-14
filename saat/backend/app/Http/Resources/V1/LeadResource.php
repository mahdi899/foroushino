<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Lead
 */
class LeadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'display_code' => $this->display_code,
            'full_name' => $this->fullName(),
            'phone' => $this->phone,
            'city' => $this->city,
            'source' => $this->source?->value,
            'temperature' => $this->temperature?->value,
            'priority' => $this->priority,
            'stage' => $this->stage?->value,
            'status' => $this->status?->value,
            'product' => $this->whenLoaded('product', fn () => [
                'id' => $this->product?->id,
                'name' => $this->product?->name,
            ]),
            'campaign_id' => $this->campaign_id,
            'budget' => $this->budget,
            'job' => $this->job,
            'experience' => $this->experience,
            'income_goal' => $this->income_goal,
            'interest_reason' => $this->interest_reason,
            'best_call_time' => $this->best_call_time,
            'last_call_at' => $this->last_call_at?->toIso8601String(),
            'call_count' => $this->call_count,
            'last_note' => $this->last_note,
            'conversion_probability' => $this->conversion_probability,
            'pain_point' => $this->pain_point,
            'objection' => $this->objection,
            'next_followup_at' => $this->next_followup_at?->toIso8601String(),
            'rating' => $this->rating,
            'assigned_agent_id' => $this->assigned_agent_id,
            'assigned_agent_name' => $this->whenLoaded('assignedAgent', fn () => $this->assignedAgent?->name),
            'assigned_team_id' => $this->assigned_team_id,
            'locked_by' => $this->locked_by,
            'locked_until' => $this->locked_until?->toIso8601String(),
            'is_locked' => $this->isLocked(),
            'returned_to_pool' => $this->returned_to_pool,
            'do_not_call' => $this->do_not_call_at !== null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'status_histories' => LeadStatusHistoryResource::collection(
                $this->whenLoaded('statusHistories'),
            ),
        ];
    }
}
