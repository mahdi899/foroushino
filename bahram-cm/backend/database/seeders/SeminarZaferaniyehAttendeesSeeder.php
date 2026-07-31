<?php

namespace Database\Seeders;

use App\Services\SeminarAttendeeRosterSyncService;
use Illuminate\Database\Seeder;

/**
 * Durable roster for Zaferaniyeh seminar attendees.
 * Re-run safely on deploy — replaces attendees for the seminar from JSON.
 */
class SeminarZaferaniyehAttendeesSeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path(SeminarAttendeeRosterSyncService::DEFAULT_JSON);
        if (! is_file($path)) {
            $this->command?->warn("Seminar attendees roster missing: {$path}");

            return;
        }

        $stats = app(SeminarAttendeeRosterSyncService::class)->syncFromJson($path);
        $this->command?->info(sprintf(
            'Seminar attendees synced: final=%d created_users=%d deleted=%d',
            $stats['final_count'],
            $stats['users_created'],
            $stats['deleted'],
        ));
    }
}
