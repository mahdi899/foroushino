<?php

namespace App\Modules\TelegramBot\Console\Commands;

use App\Modules\TelegramBot\Services\HealthCheckService;
use Illuminate\Console\Command;

class TelegramHealthCheckCommand extends Command
{
    protected $signature = 'telegram:health-check';

    protected $description = 'Run Telegram bot health checks';

    public function handle(HealthCheckService $health): int
    {
        $result = $health->run();
        $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return ($result['healthy'] ?? false) ? self::SUCCESS : self::FAILURE;
    }
}
