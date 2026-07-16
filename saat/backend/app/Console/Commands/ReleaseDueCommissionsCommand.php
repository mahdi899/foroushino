<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/** @deprecated Leader/supervisor approval replaced timed auto-release. */
class ReleaseDueCommissionsCommand extends Command
{
    protected $signature = 'commissions:release-due';

    protected $description = 'Deprecated — commissions now require leader then supervisor approval.';

    public function handle(): int
    {
        $this->comment('پورسانت‌ها فقط پس از تایید لیدر و ناظر آزاد می‌شوند؛ این دستور دیگر کاری انجام نمی‌دهد.');

        return self::SUCCESS;
    }
}
