<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Services\DestinationMembershipAuditService;
use Illuminate\Console\Command;

class TelegramAuditDestinationMembershipsCommand extends Command
{
    protected $signature = 'telegram:audit-destination-memberships';

    protected $description = 'Detect left/kicked destination members, report to admin, and release old Telegram accounts';

    public function handle(DestinationMembershipAuditService $audit): int
    {
        $result = $audit->run();

        $this->info(sprintf(
            'Checked %d · left %d · released %d',
            $result['checked'],
            $result['left'],
            $result['released'],
        ));

        return self::SUCCESS;
    }
}
