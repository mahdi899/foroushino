<?php

namespace App\Jobs\Family;

use App\Models\FamilyActionResponse;
use App\Services\Family\FamilyNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ProcessActionFollowUpJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $responseId) {}

    public function handle(FamilyNotificationService $notifications): void
    {
        DB::transaction(function () use ($notifications) {
            $response = FamilyActionResponse::query()
                ->with(['action', 'user'])
                ->lockForUpdate()
                ->find($this->responseId);

            if (! $response || $response->follow_up_sent) {
                return;
            }

            $action = $response->action;
            if (! $action || ! $action->follow_up_after_minutes) {
                return;
            }

            $message = $action->follow_up_message
                ?: 'دیروز گفتی انجامش می‌دی. انجامش دادی؟';

            if ($response->user) {
                $notifications->actionFollowUp($response->user, $message);
            }

            $response->update([
                'follow_up_sent' => true,
                'follow_up_sent_at' => now(),
            ]);
        });
    }
}
