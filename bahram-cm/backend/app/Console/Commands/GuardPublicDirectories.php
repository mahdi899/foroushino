<?php

namespace App\Console\Commands;

use App\Support\DirectoryListingGuard;
use App\Support\MediaFtpConnection;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GuardPublicDirectories extends Command
{
    protected $signature = 'media:guard-directories';

    protected $description = 'Add index.html placeholders to public media directories (disable directory listing)';

    public function handle(): int
    {
        $created = DirectoryListingGuard::backfill();

        if (MediaFtpConnection::isReady()) {
            try {
                $created += DirectoryListingGuard::backfillRemote(
                    Storage::disk(MediaFtpConnection::diskName()),
                );
            } catch (\Throwable $e) {
                $this->warn('Remote index.html backfill skipped: '.$e->getMessage());
            }
        }

        $this->info($created > 0
            ? "Created {$created} index.html guard file(s)."
            : 'All public media directories already have index.html.');

        return self::SUCCESS;
    }
}
