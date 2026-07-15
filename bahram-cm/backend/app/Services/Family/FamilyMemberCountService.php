<?php

namespace App\Services\Family;

use App\Models\Family;
use Illuminate\Support\Facades\Cache;

final class FamilyMemberCountService
{
    private function cacheKey(): string
    {
        return 'family:total_member_count';
    }

    public function total(): int
    {
        return (int) Cache::remember(
            $this->cacheKey(),
            config('family.cache.member_count_ttl', 300),
            fn () => (int) Family::query()->sum('member_count'),
        );
    }

    public function bump(int $delta = 1): void
    {
        $key = $this->cacheKey();

        if (Cache::has($key)) {
            if ($delta >= 0) {
                Cache::increment($key, $delta);
            } else {
                Cache::decrement($key, abs($delta));
            }

            return;
        }

        Cache::forget($key);
    }

    public function forget(): void
    {
        Cache::forget($this->cacheKey());
    }
}
