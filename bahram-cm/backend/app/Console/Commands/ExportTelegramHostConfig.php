<?php

namespace App\Console\Commands;

use App\Services\TelegramInfrastructureService;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Console\Command;

class ExportTelegramHostConfig extends Command
{
    protected $signature = 'telegram:export-host-config
                            {--db-database= : MySQL database name on cPanel host}
                            {--db-username= : MySQL username}
                            {--db-password= : MySQL password}
                            {--db-host=127.0.0.1 : MySQL host}
                            {--output= : Write to file instead of stdout}';

    protected $description = 'Print a filled config.php for the external Telegram host app (telegram/).';

    public function handle(TelegramInfrastructureService $infra): int
    {
        $samplePath = app(TelegramInfrastructureService::class)->hostAppRoot().DIRECTORY_SEPARATOR.'config.sample.php';
        if (! is_file($samplePath)) {
            $this->error('telegram/config.sample.php not found.');

            return self::FAILURE;
        }

        $template = (string) file_get_contents($samplePath);
        $bot = TelegramBot::query()->where('key', 'production')->first();

        if ($infra->hostSyncSecret() === null || $infra->hostEncryptionKey() === null) {
            $this->warn('Host secrets not set — save host mode in admin panel first (or re-save infrastructure).');
        }

        $filled = str_replace(
            [
                '__SYNC_BASE_URL__',
                '__HMAC_SECRET__',
                '__AES_KEY__',
                '__WEBHOOK_SECRET__',
                '__BOT_TOKEN__',
                '__DB_HOST__',
                '__DB_DATABASE__',
                '__DB_USERNAME__',
                '__DB_PASSWORD__',
                '__HOST_PUBLIC_URL__',
            ],
            [
                $infra->backendOrigin().'/api/v1/integrations/telegram-host',
                (string) ($infra->hostSyncSecret() ?? ''),
                (string) ($infra->hostEncryptionKey() ?? ''),
                (string) ($infra->webhookSecret() ?? ''),
                (string) ($bot?->resolveToken() ?? ''),
                (string) $this->option('db-host'),
                (string) ($this->option('db-database') ?? 'CHANGE_ME'),
                (string) ($this->option('db-username') ?? 'CHANGE_ME'),
                (string) ($this->option('db-password') ?? 'CHANGE_ME'),
                $infra->usesHostBridge() ? $infra->hostAppBaseUrl() : 'https://YOUR-HOST-DOMAIN',
            ],
            $template,
        );

        $output = (string) $this->option('output');
        if ($output !== '') {
            file_put_contents($output, $filled);
            $this->info("Written to {$output}");
        } else {
            $this->line($filled);
        }

        return self::SUCCESS;
    }
}
