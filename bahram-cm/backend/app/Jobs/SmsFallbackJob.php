<?php

namespace App\Jobs;

use App\Models\SmsLog;
use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Retries a failed primary SMS send via the configured fallback provider.
 */
class SmsFallbackJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public int $primaryLogId) {}

    public function handle(SmsService $sms): void
    {
        $primary = SmsLog::query()->find($this->primaryLogId);

        if (! $primary || $primary->status === 'sent') {
            return;
        }

        if (SmsLog::query()->where('fallback_of_log_id', $primary->id)->where('status', 'sent')->exists()) {
            return;
        }

        $sent = $sms->sendFallbackForLog($primary);

        Log::channel('sms')->info('SMS fallback attempt finished.', [
            'primary_log_id' => $primary->id,
            'success' => $sent,
        ]);
    }
}
