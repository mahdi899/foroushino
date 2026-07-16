<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Services\TelegramHealthCheckService;
use Illuminate\Console\Command;

class TelegramHealthCheckCommand extends Command
{
    protected $signature = 'telegram:health-check';

    protected $description = 'Run Telegram module health checks';

    public function handle(TelegramHealthCheckService $health): int
    {
        $result = $health->run();

        $this->line('Database: '.($result['database'] ? 'OK' : 'FAIL'));
        $this->line('Updates pending: '.($result['updates']['pending'] ?? 0));
        $this->line('Updates failed: '.($result['updates']['failed'] ?? 0));

        foreach ($result['bots'] as $key => $bot) {
            $this->line(sprintf(
                'Bot [%s]: token=%s api=%s webhook=%s',
                $key,
                $bot['token_present'] ? 'yes' : 'no',
                $bot['api_reachable'] ? 'yes' : 'no',
                $bot['webhook_url'] ?? 'none',
            ));
        }

        return ($result['healthy'] ?? false) ? self::SUCCESS : self::FAILURE;
    }
}
