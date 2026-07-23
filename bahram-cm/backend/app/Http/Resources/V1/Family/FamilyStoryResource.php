<?php

namespace App\Http\Resources\V1\Family;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Support\FamilyDateTime;
use App\Support\FamilyMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FamilyStory */
class FamilyStoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $media = $this->whenLoaded('media') ? $this->media : null;
        $mode = $this->audience_mode;
        $modeValue = $mode instanceof FamilyPostAudienceMode ? $mode->value : (string) ($mode ?? 'all');

        $payload = [
            'id' => $this->id,
            'caption' => $this->caption,
            'audience_mode' => $modeValue,
            'published_at' => FamilyDateTime::toApi($this->published_at),
            'expires_at' => FamilyDateTime::toApi($this->expires_at),
            'views_count' => (int) ($this->views_count ?? $this->views()->count()),
            'media' => $media ? [
                'id' => $media->id,
                'type' => $media->type?->value ?? $media->type,
                'url' => FamilyMediaUrl::fromPath($media->storage_path, $media->disk),
                'width' => $media->width,
                'height' => $media->height,
                'duration' => $media->duration,
                'mime_type' => $media->mime_type,
            ] : null,
        ];

        if ($this->relationLoaded('targets')) {
            $names = $this->targets
                ->map(fn ($target) => $target->family?->internal_name)
                ->filter()
                ->values()
                ->all();

            $payload['audience_summary'] = match ($modeValue) {
                'include' => $names !== [] ? implode('، ', $names) : 'خانواده‌های انتخابی',
                'exclude' => 'همه به‌جز '.($names !== [] ? implode('، ', $names) : '…'),
                default => 'همه خانواده‌ها',
            };
            $payload['targets'] = $this->targets->map(fn ($target) => [
                'id' => $target->id,
                'family_id' => $target->family_id,
                'family_name' => $target->family?->internal_name,
            ])->values()->all();
        }

        return $payload;
    }
}
