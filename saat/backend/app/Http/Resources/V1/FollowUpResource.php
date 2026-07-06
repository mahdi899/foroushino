<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\FollowUp
 */
class FollowUpResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_id' => $this->lead_id,
            'lead' => $this->whenLoaded('lead', fn () => [
                'id' => $this->lead->id,
                'full_name' => $this->lead->fullName(),
                'phone' => $this->lead->phone,
                'temperature' => $this->lead->temperature?->value,
            ]),
            'agent_id' => $this->agent_id,
            'kind' => $this->kind?->value,
            'title' => $this->title,
            'due_at' => $this->due_at?->toIso8601String(),
            'status' => $this->status?->value,
            'priority' => $this->priority,
            'note' => $this->note,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
