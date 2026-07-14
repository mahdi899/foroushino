<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TeamReport */
class TeamReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team->name),
            'report_date' => $this->report_date?->toDateString(),
            'status' => $this->status?->value,
            'summary' => $this->summary,
            'leader_notes' => $this->leader_notes,
            'supervisor_notes' => $this->supervisor_notes,
            'submitted_by' => $this->submitted_by,
            'submitter_name' => $this->whenLoaded('submitter', fn () => $this->submitter->name),
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'forwarded_by' => $this->forwarded_by,
            'forwarded_at' => $this->forwarded_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
