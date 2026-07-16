<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyLifecycle;
use App\Models\Family;
use Illuminate\Support\Facades\DB;

class FamilyCreationService
{
    public function create(?EntryContext $context = null): Family
    {
        return DB::transaction(function () use ($context) {
            $name = $this->nextInternalName($context);

            return Family::query()->create([
                'internal_name' => $name,
                'lifecycle' => FamilyLifecycle::Forming,
                'member_count' => 0,
                'capacity_target' => (int) config('family.capacity.target', 5000),
                'capacity_min' => (int) config('family.capacity.min', 4500),
                'capacity_max' => (int) config('family.capacity.max', 5200),
                'primary_source' => $context?->source?->value,
                'entry_event_id' => $context?->entryEventId,
            ]);
        });
    }

    public function nextInternalName(?EntryContext $context = null): string
    {
        $pool = config('family.internal_name_pool', ['سپهر', 'آبان', 'مسیر']);
        $used = Family::query()->pluck('internal_name')->all();

        foreach ($pool as $name) {
            if (! in_array($name, $used, true)) {
                return $name;
            }
        }

        $base = $pool[array_rand($pool)];
        $suffix = Family::query()->count() + 1;

        return "{$base} {$suffix}";
    }
}
