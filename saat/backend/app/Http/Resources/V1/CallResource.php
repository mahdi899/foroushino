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
            'method' => $this->method?->value,
            'state' => $this->state?->value,
            'provider_call_id' => $this->provider_call_id,
            'result' => $this->result?->value,
            'note' => $this->note,
            'duration_sec' => $this->duration_sec,
            'duration_source' => $this->duration_source?->value,
            'disconnect_reason' => $this->disconnect_reason,
            'objection' => $this->objection?->value,
            'started_at' => $this->started_at?->toIso8601String(),
            'answered_at' => $this->answered_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'correlation_id' => $this->correlation_id,
        ];
    }
}
