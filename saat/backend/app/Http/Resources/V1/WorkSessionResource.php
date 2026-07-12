<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\UserWorkSession
 */
class WorkSessionResource extends JsonResource
{
    public function __construct(
        $resource,
        private readonly ?int $liveProductiveSeconds = null,
        private readonly ?int $liveBreakSeconds = null,
    ) {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'total_break_seconds' => (int) $this->total_break_seconds,
            'total_call_seconds' => (int) $this->total_call_seconds,
            'total_productive_seconds' => (int) $this->total_productive_seconds,
            'live_productive_seconds' => $this->liveProductiveSeconds,
            'live_break_seconds' => $this->liveBreakSeconds,
        ];
    }
}
