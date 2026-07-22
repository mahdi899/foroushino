<?php

namespace App\Console\Commands;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Services\TelegramInfrastructureService;
use Illuminate\Console\Command;

class ApplyTelegramHostBridge extends Command
{
    protected $signature = 'telegram:host-apply
                            {--url= : Public base URL of the telegram/ app, e.g. https://example.com/rostam/telegram}
                            {--register-webhook : Register Telegram webhook after saving settings}';

    protected $description = 'Save external host bridge settings (domain/path) and optionally register webhook.';

    public function handle(
        TelegramInfrastructureService $infra,
        TelegramBotClientFactory $clients,
    ): int {
        $url = trim((string) $this->option('url'));
        if ($url === '') {
            $this->error('Pass --url=https://your-domain/path/to/telegram');

            return self::FAILURE;
        }

        $view = $infra->update([
            'mode' => 'host',
            'worker_url' => rtrim($url, '/'),
        ]);

        $this->info('Host bridge saved.');
        $this->line('  base:    '.(string) ($view['host_app_base_url'] ?? ''));
        $this->line('  webhook: '.(string) ($view['host_webhook_url'] ?? ''));
        $this->line('  push:    '.(string) ($view['host_push_url'] ?? ''));

        if (! $this->option('register-webhook')) {
            $this->comment('Skipped webhook registration (pass --register-webhook to set).');

            return self::SUCCESS;
        }

        $result = $infra->registerProductionWebhook($clients);
        if (! ($result['ok'] ?? false)) {
            $this->error((string) ($result['message'] ?? 'Webhook registration failed.'));

            return self::FAILURE;
        }

        $this->info((string) ($result['message'] ?? 'Webhook registered.'));
        if (! empty($result['url'])) {
            $this->line('  url: '.$result['url']);
        }

        return self::SUCCESS;
    }
}
