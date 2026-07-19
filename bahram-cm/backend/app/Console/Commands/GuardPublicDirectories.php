<?php

namespace App\Console\Commands;

use App\Support\DirectoryListingGuard;
use Illuminate\Console\Command;

class GuardPublicDirectories extends Command
{
    protected $signature = 'media:guard-directories';

    protected $description = 'Add index.html placeholders to public media directories (disable directory listing)';

    public function handle(): int
    {
        $created = DirectoryListingGuard::backfill();
        $this->info($created > 0
            ? "Created {$created} index.html guard file(s)."
            : 'All public media directories already have index.html.');

        return self::SUCCESS;
    }
}
