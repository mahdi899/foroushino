<?php

namespace App\Services\Family;

use App\Models\FamilyMedia;
use App\Models\FamilyStory;
use App\Models\User;
use Illuminate\Support\Collection;

final class FamilyStoryService
{
    /** @return Collection<int, FamilyStory> */
    public function activeStories(): Collection
    {
        return FamilyStory::query()
            ->active()
            ->with(['media', 'publisher:id,name'])
            ->orderBy('published_at')
            ->get();
    }

    public function hasActiveStories(): bool
    {
        return FamilyStory::query()->active()->exists();
    }

    public function publish(User $user, FamilyMedia $media, ?string $caption = null): FamilyStory
    {
        $now = now();

        return FamilyStory::query()->create([
            'media_id' => $media->id,
            'caption' => $caption,
            'published_by' => $user->id,
            'published_at' => $now,
            'expires_at' => $now->copy()->addDay(),
        ])->load(['media', 'publisher:id,name']);
    }

    public function delete(FamilyStory $story): void
    {
        $story->delete();
    }
}
