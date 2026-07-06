<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Call
 */
class CallResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_id' => $this->lead_id,
            'agent_id' => $this->agent_id,
            'result' => $this->result?->value,
            'note' => $this->note,
            'duration_sec' => $this->duration_sec,
            'objection' => $this->objection?->value,
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
        ];
    }
}
