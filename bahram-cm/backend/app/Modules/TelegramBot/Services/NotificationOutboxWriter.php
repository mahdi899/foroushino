<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Jobs\ProcessNotificationOutboxJob;
use App\Modules\TelegramBot\Models\NotificationOutbox;
use Illuminate\Database\QueryException;

class NotificationOutboxWriter
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  list<string>  $channels
     */
    public function write(
        string $eventType,
        ?int $userId,
        array $payload,
        array $channels,
        string $idempotencyKey,
    ): ?NotificationOutbox {
        try {
            $row = NotificationOutbox::query()->create([
                'event_type' => $eventType,
                'user_id' => $userId,
                'payload' => $payload,
                'requested_channels' => $channels,
                'idempotency_key' => $idempotencyKey,
                'status' => 'pending',
                'available_at' => now(),
            ]);
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate')) {
                return null;
            }
            throw $e;
        }

        ProcessNotificationOutboxJob::dispatch($row->id)
            ->onQueue((string) config('telegram_bot.queues.transactional', 'telegram-transactional'));

        return $row;
    }
}
