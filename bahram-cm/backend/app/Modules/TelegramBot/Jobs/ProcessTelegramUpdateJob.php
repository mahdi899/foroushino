<?php

namespace App\Modules\TelegramBot\Jobs;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use App\Modules\TelegramBot\Services\UpdateRouter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessTelegramUpdateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly int $telegramUpdateId,
    ) {}

    public function handle(UpdateRouter $router, TelegramUpdateRepository $updates): void
    {
        $update = TelegramUpdate::query()->with('bot')->find($this->telegramUpdateId);

        if ($update === null) {
            return;
        }

        if (in_array($update->status, [UpdateStatus::Processed, UpdateStatus::Skipped], true)) {
            return;
        }

        $bot = $update->bot;
        if ($bot === null) {
            $updates->markFailed($update, 'Bot missing for update.');

            return;
        }

        $telegramUserId = $update->telegramUserId();
        $lockSeconds = (int) config('telegram_bot.user_lock_seconds', 30);
        $lock = $telegramUserId !== null
            ? Cache::lock('telegram:user:'.$telegramUserId, $lockSeconds)
            : null;

        if ($lock !== null && ! $lock->get()) {
            $this->release(5);

            return;
        }

        try {
            $router->route($update, $bot);
        } catch (Throwable $e) {
            Log::channel('telegram')->error('Failed processing telegram update.', [
                'update_id' => $update->id,
                'message' => $e->getMessage(),
            ]);
            $updates->markFailed($update, $e->getMessage());
            throw $e;
        } finally {
            optional($lock)->release();
        }
    }
}
