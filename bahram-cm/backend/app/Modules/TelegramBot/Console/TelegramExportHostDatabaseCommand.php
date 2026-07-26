<?php

namespace App\Modules\TelegramBot\Console;

use App\Services\TelegramHostDatabaseExporter;
use Illuminate\Console\Command;

class TelegramExportHostDatabaseCommand extends Command
{
    protected $signature = 'telegram:export-host-database
        {--output= : Path to write .sql (default: storage/app/telegram-host-demo.sql)}
        {--user= : Only export this telegram_user_id}
        {--limit=2000 : Max accounts when exporting all}';

    protected $description = 'Export MySQL seed for the external Telegram host (messages, catalog, accounts cache)';

    public function handle(TelegramHostDatabaseExporter $exporter): int
    {
        $output = (string) ($this->option('output') ?: storage_path('app/telegram-host-demo.sql'));
        $userId = $this->option('user');
        $only = is_numeric($userId) ? (int) $userId : null;
        $limit = max(1, (int) $this->option('limit'));

        $this->info('Building host database export…');
        $count = $exporter->exportToFile($output, $only, $limit);

        $this->info("Wrote {$output}");
        $this->info("Account rows: {$count}");
        $this->line('Import on cPanel: phpMyAdmin → your telegram DB → Import → this file (after schema.sql).');

        return self::SUCCESS;
    }
}
