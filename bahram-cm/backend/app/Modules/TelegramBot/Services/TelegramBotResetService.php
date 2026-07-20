<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Enums\UpdateType;
use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use App\Services\TelegramInfrastructureService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Admin-triggered hard reset: sync secrets, clear stuck rows, pull Telegram backlog, re-register webhook.
 */
class TelegramBotResetService
{
    public function __construct(
        private readonly TelegramInfrastructureService $infrastructure,
        private readonly TelegramBotClientFactory $clientFactory,
        private readonly TelegramWebhookReconcileService $reconcile,
        private readonly TelegramUpdateRepository $updates,
    ) {}

    /** @return array<string, mixed> */
    public function reset(TelegramBot $bot, bool $pullRemote = true): array
    {
        $actions = [];
        $botKey = $bot->key;

        if ($botKey === 'production') {
            $this->infrastructure->syncProductionBotSecret();
            $bot->refresh();
            $actions[] = 'synced_webhook_secret';
        }

        $skippedStale = TelegramUpdate::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('update_type', UpdateType::CallbackQuery)
            ->whereIn('status', [UpdateStatus::Pending, UpdateStatus::Failed, UpdateStatus::Processing])
            ->where('received_at', '<=', now()->subMinutes(3))
            ->update([
                'status' => UpdateStatus::Skipped,
                'processed_at' => now(),
                'error_message' => null,
            ]);
        if ($skippedStale > 0) {
            $actions[] = "skipped_stale_callbacks:{$skippedStale}";
        }

        $resetProcessing = TelegramUpdate::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('status', UpdateStatus::Processing)
            ->where('processing_started_at', '<=', now()->subMinutes(5))
            ->update([
                'status' => UpdateStatus::Pending,
                'processing_started_at' => null,
            ]);
        if ($resetProcessing > 0) {
            $actions[] = "reset_stuck_processing:{$resetProcessing}";
        }

        $retriedFailed = 0;
        foreach ($this->updates->failedBatch(100) as $update) {
            if ($update->update_type === UpdateType::CallbackQuery
                && str_contains(strtolower((string) $update->error_message), 'query is too old')) {
                $this->updates->markSkipped($update);
                continue;
            }
            $this->updates->resetToPending($update);
            ProcessTelegramUpdateJob::dispatch($update->id)
                ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
            $retriedFailed++;
        }
        if ($retriedFailed > 0) {
            $actions[] = "retried_failed:{$retriedFailed}";
        }

        $retriedPending = 0;
        TelegramUpdate::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('status', UpdateStatus::Pending)
            ->orderBy('id')
            ->limit(50)
            ->pluck('id')
            ->each(function (int $id) use (&$retriedPending): void {
                ProcessTelegramUpdateJob::dispatch($id)
                    ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
                $retriedPending++;
            });
        if ($retriedPending > 0) {
            $actions[] = "queued_pending:{$retriedPending}";
        }

        Cache::forget("telegram:webhook-recovery:{$botKey}");

        $client = $this->clientFactory->forBot($bot);
        $expectedUrl = $this->infrastructure->buildWebhookUrl($bot->key);
        try {
            $client->setWebhook($expectedUrl, $bot->resolveWebhookSecret());
            $actions[] = 're_registered_webhook';
        } catch (\Throwable $e) {
            Log::channel('telegram')->error('telegram.reset.set_webhook_failed', [
                'bot_key' => $botKey,
                'error' => $e->getMessage(),
            ]);
            $actions[] = 'webhook_register_failed';
        }

        if ($pullRemote) {
            $reconcileResult = $this->reconcile->reconcile($botKey, forcePull: true);
            $actions = array_merge($actions, $reconcileResult['actions'] ?? []);
        }

        try {
            Artisan::call('horizon:terminate');
            $actions[] = 'horizon_terminated';
        } catch (\Throwable) {
            // Horizon may be managed by supervisor only.
        }

        $info = $client->getWebhookInfo();

        Log::channel('telegram')->info('telegram.reset.completed', [
            'bot_key' => $botKey,
            'actions' => $actions,
            'pending_remote' => (int) ($info['pending_update_count'] ?? 0),
        ]);

        return [
            'actions' => $actions,
            'pending_remote' => (int) ($info['pending_update_count'] ?? 0),
            'pending_local' => TelegramUpdate::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('status', UpdateStatus::Pending)
                ->count(),
            'failed_local' => TelegramUpdate::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('status', UpdateStatus::Failed)
                ->count(),
            'webhook_url' => (string) ($info['url'] ?? ''),
            'last_error' => trim((string) ($info['last_error_message'] ?? '')),
        ];
    }

    /** @return array{pending_local: int, failed_local: int, processing_local: int, pending_remote: int|null} */
    public function queueStats(TelegramBot $bot): array
    {
        $remote = null;
        try {
            $info = $this->clientFactory->forBot($bot)->getWebhookInfo();
            $remote = (int) ($info['pending_update_count'] ?? 0);
        } catch (\Throwable) {
            $remote = null;
        }

        return [
            'pending_local' => TelegramUpdate::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('status', UpdateStatus::Pending)
                ->count(),
            'failed_local' => TelegramUpdate::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('status', UpdateStatus::Failed)
                ->count(),
            'processing_local' => TelegramUpdate::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('status', UpdateStatus::Processing)
                ->count(),
            'pending_remote' => $remote,
        ];
    }
}
