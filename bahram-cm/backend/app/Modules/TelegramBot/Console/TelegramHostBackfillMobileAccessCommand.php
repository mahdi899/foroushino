<?php

namespace App\Modules\TelegramBot\Console;

use App\Services\TelegramHostAccountSync;
use Illuminate\Console\Command;

/**
 * One-off backfill: pre-provisions host-side access (by mobile number) for
 * every paid/fulfilled buyer who has never started the production Telegram
 * bot — e.g. seminar attendees imported in bulk via SeminarOrderImportService,
 * or anyone who paid before the mobile pre-provisioning push existed. Without
 * this, their access only ever gets pushed to the external host the moment
 * they eventually do /start (see TelegramHostAccountSync::queuePushMobileAccess()),
 * so bulk imports never made it into the host's DB at all.
 */
class TelegramHostBackfillMobileAccessCommand extends Command
{
    protected $signature = 'telegram:host-backfill-mobile-access
        {--limit=20000 : Max users to scan}';

    protected $description = 'Queue mobile-keyed access pre-provisioning for all paid buyers who never started the production Telegram bot.';

    public function handle(TelegramHostAccountSync $sync): int
    {
        $limit = max(1, (int) $this->option('limit'));

        $queued = $sync->queuePushMobileAccessForAllMissing($limit);

        $this->info("Queued mobile access pre-provisioning for {$queued} user(s).");
        $this->line('These are processed by the queue worker (PushTelegramHostSyncJob) — check `horizon`/`queue:work` and storage/logs/telegram.log.');

        return self::SUCCESS;
    }
}
