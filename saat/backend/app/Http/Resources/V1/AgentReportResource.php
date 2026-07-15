<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\AgentReport */
class AgentReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'agent_id' => $this->agent_id,
            'agent_name' => $this->whenLoaded('agent', fn () => $this->agent->name),
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team->name),
            'report_date' => $this->report_date?->toDateString(),
            'status' => $this->status?->value,
            'summary' => $this->summary,
            'agent_notes' => $this->agent_notes,
            'leader_notes' => $this->leader_notes,
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'rejected_by' => $this->rejected_by,
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
