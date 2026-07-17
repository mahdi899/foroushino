<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TelegramLogAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly TelegramUpdateRepository $updates,
    ) {}

    public function updates(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.logs.view');

        $query = TelegramUpdate::query()->with('bot:id,key,display_name')->orderByDesc('id');

        if ($botKey = $request->string('bot_key')->toString()) {
            $bot = $this->bots->findByKey($botKey);
            if ($bot) {
                $query->where('telegram_bot_id', $bot->id);
            }
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($type = $request->string('update_type')->toString()) {
            $query->where('update_type', $type);
        }

        $paginator = $query->paginate(min(max((int) $request->input('per_page', 30), 1), 100));

        return $this->paginatedResponse($paginator, fn (TelegramUpdate $u) => $this->updatePayload($u));
    }

    public function showUpdate(Request $request, TelegramUpdate $update): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.logs.view');

        $update->load('bot');

        return response()->json(['data' => $this->updatePayload($update, detailed: true)]);
    }

    public function retryFailed(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.logs.view');

        $limit = min(max((int) $request->input('limit', 50), 1), 200);
        $retried = 0;

        foreach ($this->updates->failedBatch($limit) as $update) {
            $this->updates->resetToPending($update);
            ProcessTelegramUpdateJob::dispatch($update->id)
                ->onQueue((string) config('telegram_bot.queues.updates', 'telegram-updates'));
            $retried++;
        }

        return response()->json(['data' => ['retried' => $retried]]);
    }

    public function deliveryLogs(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.logs.view');

        $query = DB::table('telegram_delivery_logs')
            ->orderByDesc('id');

        if ($botKey = $request->string('bot_key')->toString()) {
            $bot = $this->bots->findByKey($botKey);
            if ($bot) {
                $query->where('telegram_bot_id', $bot->id);
            }
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate(min(max((int) $request->input('per_page', 30), 1), 100));

        return $this->paginatedResponse($paginator, fn ($row) => [
            'id' => $row->id,
            'telegram_bot_id' => $row->telegram_bot_id,
            'telegram_account_id' => $row->telegram_account_id,
            'channel' => $row->channel,
            'purpose' => $row->purpose,
            'status' => $row->status,
            'error_message' => $row->error_message,
            'created_at' => $row->created_at,
        ]);
    }

    private function updatePayload(TelegramUpdate $update, bool $detailed = false): array
    {
        $base = [
            'id' => $update->id,
            'telegram_bot_id' => $update->telegram_bot_id,
            'bot_key' => $update->bot?->key,
            'update_id' => $update->update_id,
            'update_type' => $update->update_type?->value ?? (string) $update->update_type,
            'status' => $update->status?->value ?? (string) $update->status,
            'attempts' => $update->attempts,
            'error_message' => $update->error_message,
            'telegram_user_id' => $update->telegramUserId(),
            'received_at' => $update->received_at?->toIso8601String(),
            'failed_at' => $update->failed_at?->toIso8601String(),
        ];

        if (! $detailed) {
            return $base;
        }

        return array_merge($base, [
            'payload' => $update->payload,
            'processed_at' => $update->processed_at?->toIso8601String(),
        ]);
    }
}
