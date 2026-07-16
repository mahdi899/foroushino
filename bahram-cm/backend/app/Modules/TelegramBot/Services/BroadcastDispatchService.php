<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Jobs\ProcessBroadcastBatchJob;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBroadcast;
use App\Modules\TelegramBot\Models\TelegramBroadcastBatch;
use App\Modules\TelegramBot\Models\TelegramBroadcastRecipient;
use Illuminate\Support\Facades\DB;

class BroadcastDispatchService
{
    public function queue(TelegramBroadcast $broadcast): void
    {
        if (! in_array($broadcast->status, ['approved', 'scheduled'], true)) {
            throw new \RuntimeException('Broadcast is not approved for dispatch.');
        }

        if ($broadcast->audience_count > 1000 && $broadcast->approved_by === null) {
            throw new \RuntimeException('Second approval required for large broadcasts.');
        }

        DB::transaction(function () use ($broadcast): void {
            $accounts = TelegramAccount::query()
                ->where('telegram_bot_id', $broadcast->telegram_bot_id)
                ->whereNotNull('user_id')
                ->where('is_blocked', false)
                ->get();

            $broadcast->update([
                'status' => 'queued',
                'audience_count' => $accounts->count(),
                'started_at' => now(),
                'requires_second_approval' => $accounts->count() > 1000,
            ]);

            $index = 0;
            foreach ($accounts->chunk(100) as $chunk) {
                $batch = TelegramBroadcastBatch::query()->create([
                    'telegram_broadcast_id' => $broadcast->id,
                    'batch_index' => $index,
                    'status' => 'pending',
                ]);

                foreach ($chunk as $account) {
                    TelegramBroadcastRecipient::query()->create([
                        'telegram_broadcast_id' => $broadcast->id,
                        'telegram_account_id' => $account->id,
                        'batch_id' => $batch->id,
                        'status' => 'pending',
                    ]);
                }

                ProcessBroadcastBatchJob::dispatch($batch->id)
                    ->onQueue((string) config('telegram_bot.queues.broadcast', 'telegram-broadcast'));

                $index++;
            }
        });
    }
}
