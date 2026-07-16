<?php

namespace App\Modules\TelegramBot\Jobs;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\NotificationOutbox;
use App\Modules\TelegramBot\Models\TelegramAccount;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessNotificationOutboxJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public function __construct(
        public readonly string $outboxId,
    ) {}

    public function handle(TelegramBotClientFactory $factory): void
    {
        $row = NotificationOutbox::query()->find($this->outboxId);

        if ($row === null || $row->status === 'processed') {
            return;
        }

        $row->increment('attempts');

        try {
            $channels = $row->requested_channels ?? [];

            if (in_array('telegram', $channels, true) && $row->user_id) {
                $account = TelegramAccount::query()
                    ->where('user_id', $row->user_id)
                    ->where('is_blocked', false)
                    ->with('bot')
                    ->first();

                if ($account?->bot) {
                    $text = (string) ($row->payload['text'] ?? '');
                    if ($text !== '') {
                        $factory->forBot($account->bot)->sendMessage(
                            $account->telegram_user_id,
                            $text,
                            (array) ($row->payload['options'] ?? []),
                        );
                    }
                }
            }

            $row->update([
                'status' => 'processed',
                'processed_at' => now(),
                'last_error' => null,
            ]);
        } catch (Throwable $e) {
            Log::channel('telegram')->error('Outbox processing failed.', [
                'outbox_id' => $row->id,
                'message' => $e->getMessage(),
            ]);
            $row->update([
                'status' => 'failed',
                'last_error' => mb_substr($e->getMessage(), 0, 2000),
            ]);
            throw $e;
        }
    }
}
