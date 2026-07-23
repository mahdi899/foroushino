<?php

namespace App\Console\Commands;

use App\Services\Family\FamilyPostPublisher;
use Illuminate\Console\Command;

class PublishScheduledFamilyPosts extends Command
{
    protected $signature = 'family:publish-scheduled';

    protected $description = 'Publish family posts whose scheduled_publish_at has passed';

    public function handle(FamilyPostPublisher $publisher): int
    {
        $count = $publisher->publishDueScheduled();

        if ($count > 0) {
            $this->info("Published {$count} scheduled family post(s).");
        }

        return self::SUCCESS;
    }
}
