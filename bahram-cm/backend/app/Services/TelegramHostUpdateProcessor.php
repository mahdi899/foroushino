<?php

namespace App\Services;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use App\Modules\TelegramBot\Services\TelegramUserRateLimiter;
use App\Modules\TelegramBot\Services\UpdateIngestService;
use App\Modules\TelegramBot\Services\UpdateRouter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Runs a raw Telegram update through the full Laravel bot pipeline.
 * Used when the external host delegates admin, group, or complex flows.
 */
class TelegramHostUpdateProcessor
{
    public function __construct(
        private readonly UpdateIngestService $ingest,
        private readonly UpdateRouter $router,
        private readonly TelegramUserRateLimiter $rateLimiter,
        private readonly TelegramUpdateRepository $updates,
    ) {}

    /** @param  array<string, mixed>  $payload */
    public function process(TelegramBot $bot, array $payload): void
    {
        $update = $this->ingest->ingest($bot, $payload);

        if ($update === null) {
            return;
        }

        $update->loadMissing('bot');
        $telegramUserId = $update->telegramUserId();

        if ($telegramUserId !== null) {
            if ($this->rateLimiter->tooManyAttempts($telegramUserId)) {
                Log::channel('telegram')->info('Telegram host delegate: user rate limited.', [
                    'update_id' => $update->id,
                    'telegram_user_id' => $telegramUserId,
                ]);
                $this->updates->markSkipped($update);

                return;
            }

            $this->rateLimiter->hit($telegramUserId);
        }

        $lockSeconds = (int) config('telegram_bot.user_lock_seconds', 30);
        $lock = $telegramUserId !== null
            ? Cache::lock('telegram:user:'.$telegramUserId, $lockSeconds)
            : null;

        if ($lock !== null && ! $lock->get()) {
            $lock->block(min($lockSeconds, 10));
        }

        try {
            $this->router->route($update, $bot);
        } catch (Throwable $e) {
            Log::channel('telegram')->error('Telegram host delegate failed.', [
                'update_id' => $update->id,
                'message' => $e->getMessage(),
            ]);

            if ($this->isExpiredCallbackError($e)) {
                $this->updates->markSkipped($update);

                return;
            }

            throw $e;
        } finally {
            optional($lock)->release();
        }
    }

    private function isExpiredCallbackError(Throwable $e): bool
    {
        $message = strtolower($e->getMessage());

        return str_contains($message, 'query is too old')
            || str_contains($message, 'query id is invalid')
            || str_contains($message, 'response timeout expired');
    }
}
