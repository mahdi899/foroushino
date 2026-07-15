<?php

namespace Database\Seeders\Support;

use App\Models\FamilyPost;

final class FamilyDemoPostLookup
{
    public static function find(string $demoKey): ?FamilyPost
    {
        return FamilyPost::query()
            ->whereHas('blocks', fn ($q) => $q->where('data->demo_key', $demoKey))
            ->first();
    }
}
