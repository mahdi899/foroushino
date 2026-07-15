<?php

namespace App\Services\Family;

use App\Models\FamilyMedia;
use App\Models\FamilyStory;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

final class FamilyStoryService
{
    private const ACTIVE_FLAG_KEY = 'family:stories:active';

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
        return (bool) Cache::remember(
            self::ACTIVE_FLAG_KEY,
            config('family.cache.stories_flag_ttl', 60),
            fn () => FamilyStory::query()->active()->exists(),
        );
    }

    public function latestActiveStoryId(): ?int
    {
        if (! $this->hasActiveStories()) {
            return null;
        }

        $id = FamilyStory::query()->active()->max('id');

        return $id !== null ? (int) $id : null;
    }

    public function publish(User $user, FamilyMedia $media, ?string $caption = null): FamilyStory
    {
        $now = now();

        $story = FamilyStory::query()->create([
            'media_id' => $media->id,
            'caption' => $caption,
            'published_by' => $user->id,
            'published_at' => $now,
            'expires_at' => $now->copy()->addDay(),
        ])->load(['media', 'publisher:id,name']);

        Cache::forget(self::ACTIVE_FLAG_KEY);

        return $story;
    }

    public function delete(FamilyStory $story): void
    {
        $story->delete();
        Cache::forget(self::ACTIVE_FLAG_KEY);
    }
}
