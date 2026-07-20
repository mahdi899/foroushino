<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use App\Services\TelegramInfrastructureService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Keeps the production webhook healthy and recovers stuck Telegram queues.
 *
 * Normal run (every minute): probe getMe/getWebhookInfo via Worker or direct API,
 * sync webhook secret, re-register if URL/secret drifted, retry local pending/failed rows.
 *
 * Recovery pull: when Telegram reports pending updates + delivery errors, briefly
 * switches to getUpdates (webhook off), ingests backlog, then re-registers webhook.
 */
class TelegramWebhookReconcileService
{
    public function __construct(
        private readonly BotResolver $botResolver,
        private readonly TelegramBotClientFactory $clientFactory,
        private readonly TelegramInfrastructureService $infrastructure,
        private readonly UpdateIngestService $ingest,
        private readonly TelegramUpdateRepository $updates,
    ) {}

    /** @return array<string, mixed> */
    public function reconcile(string $botKey = 'production', bool $forcePull = false): array
    {
        if (! config('telegram_bot.reconcile.enabled', true)) {
            return ['skipped' => true, 'reason' => 'disabled'];
        }

        $bot = $this->botResolver->resolve($botKey);

        if (! filled($bot->resolveToken())) {
            return ['skipped' => true, 'reason' => 'missing_bot_token', 'bot_key' => $botKey];
        }

        $client = $this->clientFactory->forBot($bot);
        $actions = [];

        try {
            $client->getMe();
            $actions[] = 'api_probe_ok';
        } catch (\Throwable $e) {
            Log::channel('telegram')->warning('telegram.reconcile.api_probe_failed', [
                'bot_key' => $botKey,
                'error' => $e->getMessage(),
            ]);

            return [
                'healthy' => false,
                'bot_key' => $botKey,
                'mode' => $this->infrastructure->usesWorkerBridge() ? 'worker' : 'direct',
                'actions' => $actions,
                'error' => $e->getMessage(),
            ];
        }

        if ($this->shouldSyncBotSecret($bot)) {
            $this->infrastructure->syncProductionBotSecret();
            $bot->refresh();
            $actions[] = 'synced_webhook_secret';
        }

        $info = $client->getWebhookInfo();
        $expectedUrl = $this->infrastructure->buildWebhookUrl($bot->key);
        $actualUrl = trim((string) ($info['url'] ?? ''));
        $pendingRemote = (int) ($info['pending_update_count'] ?? 0);
        $lastError = trim((string) ($info['last_error_message'] ?? ''));

        if ($actualUrl === '' || $actualUrl !== $expectedUrl) {
            $this->registerWebhook($client, $bot, $expectedUrl);
            $actions[] = 're_registered_webhook';
            $info = $client->getWebhookInfo();
            $actualUrl = trim((string) ($info['url'] ?? ''));
            $pendingRemote = (int) ($info['pending_update_count'] ?? 0);
            $lastError = trim((string) ($info['last_error_message'] ?? ''));
        } elseif ($this->shouldReRegisterAfterError($lastError)) {
            $this->registerWebhook($client, $bot, $expectedUrl);
            $actions[] = 'healed_webhook_after_error';
        }

        if ($forcePull || $this->shouldPullRemoteBacklog($pendingRemote, $lastError, $botKey)) {
            $pulled = $this->pullRemoteBacklog($client, $bot, $expectedUrl);
            if ($pulled > 0) {
                $actions[] = "pulled_remote_updates:{$pulled}";
            }
            $info = $client->getWebhookInfo();
            $pendingRemote = (int) ($info['pending_update_count'] ?? 0);
            $lastError = trim((string) ($info['last_error_message'] ?? ''));
        }

        $retriedFailed = $this->retryFailedLocalUpdates();
        if ($retriedFailed > 0) {
            $actions[] = "retried_failed_local:{$retriedFailed}";
        }

        $retriedStale = $this->retryStaleLocalUpdates($bot);
        if ($retriedStale > 0) {
            $actions[] = "retried_stale_local:{$retriedStale}";
        }

        $healthy = $actualUrl === $expectedUrl
            && ($pendingRemote === 0 || $lastError === '')
            && filled($bot->resolveWebhookSecret());

        if ($actions !== [] && $actions !== ['api_probe_ok']) {
            Log::channel('telegram')->info('telegram.reconcile.completed', [
                'bot_key' => $botKey,
                'mode' => $this->infrastructure->usesWorkerBridge() ? 'worker' : 'direct',
                'pending_remote' => $pendingRemote,
                'last_error' => $lastError !== '' ? $lastError : null,
                'actions' => $actions,
                'healthy' => $healthy,
            ]);
        }

        return [
            'healthy' => $healthy,
            'bot_key' => $botKey,
            'mode' => $this->infrastructure->usesWorkerBridge() ? 'worker' : 'direct',
            'expected_webhook_url' => $expectedUrl,
            'actual_webhook_url' => $actualUrl,
            'pending_remote' => $pendingRemote,
            'last_error' => $lastError !== '' ? $lastError : null,
            'actions' => $actions,
        ];
    }

    private function shouldSyncBotSecret(TelegramBot $bot): bool
    {
        if ($bot->key !== 'production') {
            return false;
        }

        $infraSecret = trim((string) ($this->infrastructure->webhookSecret() ?? ''));
        $botSecret = trim((string) ($bot->webhook_secret ?? ''));

        return $infraSecret !== '' && $infraSecret !== $botSecret;
    }

    private function shouldReRegisterAfterError(string $lastError): bool
    {
        if ($lastError === '') {
            return false;
        }

        $needles = ['403', 'forbidden', '502', '503', 'timeout', 'wrong response'];

        foreach ($needles as $needle) {
            if (str_contains(strtolower($lastError), $needle)) {
                return true;
            }
        }

        return false;
    }

    private function shouldPullRemoteBacklog(int $pendingRemote, string $lastError, string $botKey): bool
    {
        $threshold = (int) config('telegram_bot.reconcile.pending_pull_threshold', 3);
        if ($pendingRemote < $threshold || $lastError === '') {
            return false;
        }

        $cooldown = (int) config('telegram_bot.reconcile.recovery_cooldown_seconds', 300);
        $lockKey = "telegram:webhook-recovery:{$botKey}";

        return Cache::add($lockKey, now()->timestamp, $cooldown);
    }

    private function registerWebhook(
        TelegramBotClientInterface $client,
        TelegramBot $bot,
        string $url,
    ): void {
        $this->infrastructure->syncProductionBotSecret();
        $bot->refresh();
        $client->setWebhook($url, $bot->resolveWebhookSecret());
    }

    private function pullRemoteBacklog(
        TelegramBotClientInterface $client,
        TelegramBot $bot,
        string $expectedUrl,
    ): int {
        $limit = (int) config('telegram_bot.reconcile.pull_batch_limit', 50);
        $allowedUpdates = (array) config('telegram_bot.webhook.allowed_updates', []);
        $ingested = 0;
        $offset = null;

        try {
            $client->deleteWebhook(false);

            while ($ingested < $limit) {
                $batchLimit = min(100, $limit - $ingested);
                $options = [
                    'timeout' => 0,
                    'limit' => $batchLimit,
                    'allowed_updates' => $allowedUpdates,
                ];

                if ($offset !== null) {
                    $options['offset'] = $offset;
                }

                $updates = $client->getUpdates($options);
                if ($updates === []) {
                    break;
                }

                foreach ($updates as $payload) {
                    if (! is_array($payload)) {
                        continue;
                    }

                    $updateId = (int) ($payload['update_id'] ?? 0);
                    if ($updateId <= 0) {
                        continue;
                    }

                    $offset = $updateId + 1;

                    $update = $this->ingest->ingest($bot, $payload);
                    if ($update !== null && $update->wasRecentlyCreated) {
                        ProcessTelegramUpdateJob::dispatch($update->id)
                            ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
                        $ingested++;
                    }

                    if ($ingested >= $limit) {
                        break;
                    }
                }

                if (count($updates) < $batchLimit) {
                    break;
                }
            }
        } catch (\Throwable $e) {
            Log::channel('telegram')->error('telegram.reconcile.pull_failed', [
                'bot_key' => $bot->key,
                'ingested_before_failure' => $ingested,
                'error' => $e->getMessage(),
            ]);
        } finally {
            try {
                $this->registerWebhook($client, $bot, $expectedUrl);
            } catch (\Throwable $e) {
                Log::channel('telegram')->critical('telegram.reconcile.webhook_restore_failed', [
                    'bot_key' => $bot->key,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $ingested;
    }

    private function retryFailedLocalUpdates(): int
    {
        $limit = (int) config('telegram_bot.updates.retry_batch_size', 50);
        $batch = $this->updates->failedBatch($limit);
        $count = 0;

        foreach ($batch as $update) {
            $this->updates->resetToPending($update);
            ProcessTelegramUpdateJob::dispatch($update->id)
                ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
            $count++;
        }

        return $count;
    }

    private function retryStaleLocalUpdates(TelegramBot $bot): int
    {
        $staleSeconds = (int) config('telegram_bot.reconcile.stale_pending_seconds', 120);
        $limit = (int) config('telegram_bot.reconcile.stale_pending_batch', 30);
        $cutoff = now()->subSeconds($staleSeconds);

        $rows = TelegramUpdate::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('status', UpdateStatus::Pending)
            ->where('received_at', '<=', $cutoff)
            ->orderBy('id')
            ->limit($limit)
            ->get();

        foreach ($rows as $update) {
            ProcessTelegramUpdateJob::dispatch($update->id)
                ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
        }

        return $rows->count();
    }
}
