<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Services\BotResolver;
use App\Modules\TelegramBot\Services\UpdateIngestService;
use Illuminate\Console\Command;

class TelegramPollCommand extends Command
{
    protected $signature = 'telegram:poll
        {botKey? : Bot key from config}
        {--timeout=25 : Long-poll timeout in seconds}
        {--once : Fetch one batch and exit}';

    protected $description = 'Poll Telegram getUpdates for local development (webhook must be off)';

    public function handle(
        BotResolver $resolver,
        TelegramBotClientFactory $clients,
        UpdateIngestService $ingest,
    ): int {
        if (! app()->environment('local', 'testing')) {
            $this->error('telegram:poll is only available in local/testing environments.');

            return self::FAILURE;
        }

        $botKey = (string) ($this->argument('botKey') ?? config('telegram_bot.default_bot_key', 'production'));
        $bot = $resolver->resolve($botKey);
        $client = $clients->forBot($bot);

        $me = $client->getMe();
        $username = (string) ($me['username'] ?? $bot->username ?? $botKey);
        $this->info("Polling @{$username} [{$bot->key}] — Ctrl+C to stop.");

        $webhook = $client->getWebhookInfo();
        if (trim((string) ($webhook['url'] ?? '')) !== '') {
            $this->warn('Webhook is active; deleting so getUpdates can run…');
            $client->deleteWebhook(false);
        }

        $offset = null;
        $timeout = max(1, min(50, (int) $this->option('timeout')));

        do {
            try {
                $options = [
                    'timeout' => $timeout,
                    'allowed_updates' => [
                        'message', 'edited_message', 'callback_query',
                        'my_chat_member', 'chat_member', 'chat_join_request',
                    ],
                ];

                if ($offset !== null) {
                    $options['offset'] = $offset;
                }

                $updates = $client->getUpdates($options);
            } catch (\Throwable $e) {
                $this->warn($e->getMessage());
                continue;
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

                $update = $ingest->ingest($bot, $payload);

                if ($update !== null && $update->wasRecentlyCreated) {
                    $this->line("Update #{$updateId} ingested.");

                    try {
                        if (config('queue.default') === 'sync') {
                            ProcessTelegramUpdateJob::dispatchSync($update->id);
                        } else {
                            ProcessTelegramUpdateJob::dispatch($update->id)
                                ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
                        }
                    } catch (\Throwable $e) {
                        $this->warn("Update #{$updateId} failed: {$e->getMessage()}");
                    }
                }
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }
}
