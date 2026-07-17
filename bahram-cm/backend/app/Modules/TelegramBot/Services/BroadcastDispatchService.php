<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBroadcast;
use App\Modules\TelegramBot\Models\TelegramBroadcastBatch;
use App\Modules\TelegramBot\Models\TelegramBroadcastRecipient;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BroadcastDispatchService
{
    public function __construct(
        private readonly TelegramQueueDispatcher $queueDispatcher,
        private readonly TelegramAudienceSegmentResolver $segments,
    ) {}

    public function queue(TelegramBroadcast $broadcast): void
    {
        if (! in_array($broadcast->status, ['approved', 'scheduled'], true)) {
            throw new RuntimeException('پیام همگانی هنوز تأیید نشده است.');
        }

        if ($broadcast->audience_count > 1000 && $broadcast->approved_by === null) {
            throw new RuntimeException('برای ارسال به بیش از ۱۰۰۰ نفر، تأیید دوم لازم است.');
        }

        $batchIds = [];

        DB::transaction(function () use ($broadcast, &$batchIds): void {
            $accounts = $this->segments->accounts(
                (int) $broadcast->telegram_bot_id,
                $broadcast->segment_key ?: 'all_bot_users',
            );

            if ($accounts->isEmpty()) {
                throw new RuntimeException('هیچ کاربر فعالی برای این مخاطب یافت نشد.');
            }

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

                $batchIds[] = $batch->id;
                $index++;
            }
        });

        // Dispatch after commit so sync/async workers always see persisted rows.
        foreach ($batchIds as $batchId) {
            $this->queueDispatcher->dispatchBroadcastBatch($batchId);
        }
    }
}
