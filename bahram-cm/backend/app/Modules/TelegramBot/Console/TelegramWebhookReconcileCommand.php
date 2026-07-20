<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Services\TelegramWebhookReconcileService;
use Illuminate\Console\Command;

class TelegramWebhookReconcileCommand extends Command
{
    protected $signature = 'telegram:reconcile-webhook
        {botKey? : Bot key (default: production)}
        {--force-pull : Force getUpdates recovery even if webhook looks healthy}';

    protected $description = 'Probe Telegram webhook health, heal config drift, and recover stuck updates';

    public function handle(TelegramWebhookReconcileService $reconcile): int
    {
        $botKey = (string) ($this->argument('botKey') ?? config('telegram_bot.default_bot_key', 'production'));
        $result = $reconcile->reconcile($botKey, (bool) $this->option('force-pull'));

        if ($result['skipped'] ?? false) {
            $this->warn('Skipped: '.($result['reason'] ?? 'unknown'));

            return self::SUCCESS;
        }

        $this->line(sprintf(
            'Bot [%s] mode=%s healthy=%s pending_remote=%d',
            $result['bot_key'] ?? $botKey,
            $result['mode'] ?? '?',
            ($result['healthy'] ?? false) ? 'yes' : 'no',
            $result['pending_remote'] ?? 0,
        ));

        if (filled($result['last_error'] ?? null)) {
            $this->warn('Last Telegram error: '.$result['last_error']);
        }

        $actions = $result['actions'] ?? [];
        if ($actions !== []) {
            $this->line('Actions: '.implode(', ', $actions));
        }

        if (isset($result['error'])) {
            $this->error($result['error']);

            return self::FAILURE;
        }

        return ($result['healthy'] ?? false) ? self::SUCCESS : self::FAILURE;
    }
}
