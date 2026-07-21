<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Models\FamilyStory;
use Illuminate\Database\Eloquent\Builder;

class StoryAudienceResolver
{
    public function visibleToFamily(FamilyStory $story, int $familyId): bool
    {
        $mode = $story->audience_mode;

        if ($mode === FamilyPostAudienceMode::All || $mode === 'all') {
            return true;
        }

        $targeted = $story->targets()->where('family_id', $familyId)->exists();

        return match ($mode) {
            FamilyPostAudienceMode::Include, 'include' => $targeted,
            FamilyPostAudienceMode::Exclude, 'exclude' => ! $targeted,
            default => false,
        };
    }

    public function scopeVisibleToFamily(Builder $query, int $familyId): Builder
    {
        return $query->where(function (Builder $q) use ($familyId) {
            $q->where('audience_mode', FamilyPostAudienceMode::All->value)
                ->orWhere(function (Builder $include) use ($familyId) {
                    $include->where('audience_mode', FamilyPostAudienceMode::Include->value)
                        ->whereExists(function ($sub) use ($familyId) {
                            $sub->selectRaw('1')
                                ->from('family_story_targets')
                                ->whereColumn('family_story_targets.story_id', 'family_stories.id')
                                ->where('family_story_targets.family_id', $familyId);
                        });
                })
                ->orWhere(function (Builder $exclude) use ($familyId) {
                    $exclude->where('audience_mode', FamilyPostAudienceMode::Exclude->value)
                        ->whereNotExists(function ($sub) use ($familyId) {
                            $sub->selectRaw('1')
                                ->from('family_story_targets')
                                ->whereColumn('family_story_targets.story_id', 'family_stories.id')
                                ->where('family_story_targets.family_id', $familyId);
                        });
                });
        });
    }
}
