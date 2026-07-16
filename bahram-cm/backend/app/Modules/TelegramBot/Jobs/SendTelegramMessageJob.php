<?php

namespace App\Modules\TelegramBot\Jobs;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendTelegramMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    /** @param  array<string, mixed>  $options */
    public function __construct(
        public readonly int $telegramBotId,
        public readonly int|string $chatId,
        public readonly string $text,
        public readonly array $options = [],
    ) {}

    public function handle(TelegramBotClientFactory $factory): void
    {
        $bot = TelegramBot::query()->find($this->telegramBotId);

        if ($bot === null) {
            return;
        }

        try {
            $factory->forBot($bot)->sendMessage($this->chatId, $this->text, $this->options);
        } catch (Throwable $e) {
            Log::channel('telegram')->error('SendTelegramMessageJob failed.', [
                'bot_id' => $this->telegramBotId,
                'chat_id' => $this->chatId,
                'message' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
