<?php

namespace Database\Seeders;

use App\Enums\AdminTelegramEventKey;
use App\Models\AdminTelegramEventConfig;
use Illuminate\Database\Seeder;

class AdminTelegramSeeder extends Seeder
{
    public function run(): void
    {
        foreach (AdminTelegramEventKey::all() as $index => $event) {
            $existing = AdminTelegramEventConfig::query()->where('event_key', $event->value)->first();

            AdminTelegramEventConfig::query()->updateOrCreate(
                ['event_key' => $event->value],
                [
                    'label_fa' => $event->label(),
                    'description' => $event->description(),
                    'is_enabled' => $existing?->is_enabled ?? $event->defaultEnabled(),
                    'sort_order' => $index + 1,
                ],
            );
        }
    }
}
