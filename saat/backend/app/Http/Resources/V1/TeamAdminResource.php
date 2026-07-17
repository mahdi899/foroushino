<?php

namespace App\Http\Resources\V1;

use App\Support\TeamCapacity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Team
 */
class TeamAdminResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'leader_id' => $this->leader_id,
            'leader_name' => $this->whenLoaded('leader', fn () => $this->leader?->name),
            'supervisor_id' => $this->supervisor_id,
            'supervisor_name' => $this->whenLoaded('supervisor', fn () => $this->supervisor?->name),
            'members_count' => $this->whenCounted('members'),
            'agents_count' => $this->whenCounted('agents_count'),
            'agents_capacity' => TeamCapacity::AGENTS_PER_TEAM,
        ];
    }
}
