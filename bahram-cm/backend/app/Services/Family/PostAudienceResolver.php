<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Models\FamilyPost;
use Illuminate\Database\Eloquent\Builder;

class PostAudienceResolver
{
    public function visibleToFamily(FamilyPost $post, int $familyId): bool
    {
        $mode = $post->audience_mode;

        if ($mode === FamilyPostAudienceMode::All) {
            return true;
        }

        $targeted = $post->targets()->where('family_id', $familyId)->exists();

        return match ($mode) {
            FamilyPostAudienceMode::Include => $targeted,
            FamilyPostAudienceMode::Exclude => ! $targeted,
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
                                ->from('family_post_targets')
                                ->whereColumn('family_post_targets.post_id', 'family_posts.id')
                                ->where('family_post_targets.family_id', $familyId);
                        });
                })
                ->orWhere(function (Builder $exclude) use ($familyId) {
                    $exclude->where('audience_mode', FamilyPostAudienceMode::Exclude->value)
                        ->whereNotExists(function ($sub) use ($familyId) {
                            $sub->selectRaw('1')
                                ->from('family_post_targets')
                                ->whereColumn('family_post_targets.post_id', 'family_posts.id')
                                ->where('family_post_targets.family_id', $familyId);
                        });
                });
        });
    }
}
