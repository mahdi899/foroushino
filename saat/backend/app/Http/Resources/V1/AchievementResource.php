<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Achievement
 */
class AchievementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $userAchievement = $this->userAchievements->first();

        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'description' => $this->description,
            'icon' => $this->icon,
            'target' => $this->target,
            'progress' => $userAchievement?->progress ?? 0,
            'unlocked' => $userAchievement?->unlocked_at !== null,
            'unlocked_at' => $userAchievement?->unlocked_at?->toIso8601String(),
        ];
    }
}
