<?php

namespace App\Jobs;

use App\Enums\AdminTelegramEventKey;
use App\Services\AdminTelegramLogService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendAdminTelegramLogJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @param  array<string, mixed>  $context */
    public function __construct(
        public AdminTelegramEventKey $eventKey,
        public array $context = [],
    ) {}

    public function handle(AdminTelegramLogService $telegram): void
    {
        $telegram->sendNow($this->eventKey, $this->context);
    }
}
