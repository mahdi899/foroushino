<?php

namespace App\Console\Commands;

use App\Models\Lead;
use Illuminate\Console\Command;

class ReleaseStaleLeadLocksCommand extends Command
{
    protected $signature = 'leads:release-stale-locks';

    protected $description = 'Releases lead locks whose lock window has expired so they return to the assignable pool.';

    public function handle(): int
    {
        $count = Lead::query()
            ->whereNotNull('locked_by')
            ->where('locked_until', '<', now())
            ->update(['locked_by' => null, 'locked_until' => null]);

        $this->info("Released {$count} stale lead lock(s).");

        return self::SUCCESS;
    }
}
