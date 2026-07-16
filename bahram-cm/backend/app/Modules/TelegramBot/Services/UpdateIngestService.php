<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\UpdateType;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;

class UpdateIngestService
{
    public function __construct(
        private readonly TelegramUpdateRepository $updates,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return TelegramUpdate|null Null when update_id missing or already ingested (idempotent).
     */
    public function ingest(TelegramBot $bot, array $payload): ?TelegramUpdate
    {
        $updateId = (int) ($payload['update_id'] ?? 0);

        if ($updateId <= 0) {
            return null;
        }

        return $this->updates->createIfNotExists(
            $bot,
            $updateId,
            UpdateType::fromPayload($payload),
            $payload,
        );
    }
}
