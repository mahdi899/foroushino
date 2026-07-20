<?php

namespace App\Modules\TelegramBot\Http\Controllers;

use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\UpdateIngestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController
{
    public function __construct(
        private readonly UpdateIngestService $ingest,
    ) {}

    public function __invoke(Request $request, string $botKey): JsonResponse
    {
        /** @var TelegramBot $bot */
        $bot = $request->attributes->get('telegram_bot');

        /** @var array<string, mixed> $payload */
        $payload = $request->all();

        if (! isset($payload['update_id'])) {
            return response()->json(['ok' => true]);
        }

        $update = $this->ingest->ingest($bot, $payload);

        if ($update !== null && $update->wasRecentlyCreated) {
            if (config('telegram_bot.outbound_sync', false)) {
                ProcessTelegramUpdateJob::dispatchSync($update->id);
            } else {
                ProcessTelegramUpdateJob::dispatch($update->id)
                    ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
            }
        }

        return response()->json(['ok' => true]);
    }
}
