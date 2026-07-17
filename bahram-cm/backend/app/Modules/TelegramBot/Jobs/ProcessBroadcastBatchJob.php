<?php

namespace App\Modules\TelegramBot\Jobs;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBroadcast;
use App\Modules\TelegramBot\Models\TelegramBroadcastBatch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class ProcessBroadcastBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly int $batchId,
    ) {}

    public function handle(TelegramBotClientFactory $factory): void
    {
        $batch = TelegramBroadcastBatch::query()->with(['broadcast.bot', 'recipients.account'])->find($this->batchId);

        if ($batch === null) {
            return;
        }

        /** @var TelegramBroadcast $broadcast */
        $broadcast = $batch->broadcast;

        if ($broadcast->stopped_at !== null || $broadcast->status === 'stopped') {
            $batch->update(['status' => 'stopped']);

            return;
        }

        $batch->update(['status' => 'processing']);
        $client = $factory->forBot($broadcast->bot);
        $text = (string) ($broadcast->content['text'] ?? '');
        $options = (array) ($broadcast->content['options'] ?? []);

        foreach ($batch->recipients as $recipient) {
            if ($recipient->status !== 'pending') {
                continue;
            }

            try {
                $account = $recipient->account;
                if ($account === null) {
                    $recipient->update([
                        'status' => 'failed',
                        'error_message' => 'Telegram account not found.',
                    ]);

                    continue;
                }

                $client->sendMessage($account->telegram_user_id, $text, $options);
                $recipient->update(['status' => 'sent', 'sent_at' => now()]);
            } catch (Throwable $e) {
                $recipient->update([
                    'status' => 'failed',
                    'error_message' => mb_substr($e->getMessage(), 0, 1000),
                ]);
            }
        }

        $batch->update(['status' => 'done']);

        $pendingBatches = TelegramBroadcastBatch::query()
            ->where('telegram_broadcast_id', $broadcast->id)
            ->whereIn('status', ['pending', 'processing'])
            ->exists();

        if (! $pendingBatches) {
            $broadcast->update([
                'status' => 'finished',
                'finished_at' => now(),
            ]);
        }
    }
}
