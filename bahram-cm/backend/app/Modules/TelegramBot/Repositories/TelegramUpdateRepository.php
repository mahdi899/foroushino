<?php

namespace App\Modules\TelegramBot\Repositories;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Enums\UpdateType;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;

class TelegramUpdateRepository
{
    /**
     * Idempotently persist an inbound update. Returns null if this
     * (telegram_bot_id, update_id) pair already exists — the caller must
     * NOT re-dispatch processing in that case, but should still respond
     * 200 OK to Telegram.
     *
     * @param  array<string, mixed>  $payload
     */
    public function createIfNotExists(
        TelegramBot $bot,
        int $updateId,
        UpdateType $updateType,
        array $payload,
    ): ?TelegramUpdate {
        try {
            return TelegramUpdate::query()->create([
                'telegram_bot_id' => $bot->id,
                'update_id' => $updateId,
                'update_type' => $updateType,
                'payload' => $payload,
                'status' => UpdateStatus::Pending,
                'attempts' => 0,
                'received_at' => now(),
            ]);
        } catch (QueryException $e) {
            if ($this->isUniqueConstraintViolation($e)) {
                return null;
            }

            throw $e;
        }
    }

    public function markProcessing(TelegramUpdate $update): TelegramUpdate
    {
        $update->update([
            'status' => UpdateStatus::Processing,
            'processing_started_at' => now(),
            'attempts' => $update->attempts + 1,
        ]);

        return $update;
    }

    public function markProcessed(TelegramUpdate $update): TelegramUpdate
    {
        $update->update([
            'status' => UpdateStatus::Processed,
            'processed_at' => now(),
            'error_message' => null,
        ]);

        return $update;
    }

    public function markSkipped(TelegramUpdate $update): TelegramUpdate
    {
        $update->update([
            'status' => UpdateStatus::Skipped,
            'processed_at' => now(),
            'error_message' => null,
        ]);

        return $update;
    }

    public function markFailed(TelegramUpdate $update, string $errorMessage): TelegramUpdate
    {
        $update->update([
            'status' => UpdateStatus::Failed,
            'failed_at' => now(),
            'error_message' => mb_substr($errorMessage, 0, 2000),
        ]);

        return $update;
    }

    public function resetToPending(TelegramUpdate $update): TelegramUpdate
    {
        $update->update([
            'status' => UpdateStatus::Pending,
            'error_message' => null,
        ]);

        return $update;
    }

    /** @return Collection<int, TelegramUpdate> */
    public function failedBatch(int $limit): Collection
    {
        return TelegramUpdate::query()
            ->where('status', UpdateStatus::Failed)
            ->where('attempts', '<', (int) config('telegram_bot.updates.max_attempts', 5))
            ->orderBy('id')
            ->limit($limit)
            ->get();
    }

    private function isUniqueConstraintViolation(QueryException $e): bool
    {
        // MySQL: 1062, SQLite: "UNIQUE constraint failed", Postgres: 23505.
        $sqlState = $e->errorInfo[0] ?? null;

        return $sqlState === '23000'
            || $sqlState === '23505'
            || str_contains($e->getMessage(), 'UNIQUE constraint failed')
            || str_contains($e->getMessage(), 'Duplicate entry');
    }
}
