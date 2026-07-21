<?php

namespace App\Jobs\Integrations;

use App\Models\Lead;
use App\Services\Integrations\BahramCallbackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use RuntimeException;

class ReportLeadStatusToBahramJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [10, 30, 60, 120];

    public function __construct(public int $leadId, public string $status) {}

    public function handle(BahramCallbackService $callback): void
    {
        $lead = Lead::query()->find($this->leadId);

        if (! $lead || $lead->bahram_application_id === null) {
            return;
        }

        // Use the status captured at dispatch time — the lead may have moved
        // on again by the time this job runs, in which case a later job
        // (dispatched by the newer update) will report the newer value.
        $lead->status = $this->status;

        if (! $callback->reportStatus($lead)) {
            throw new RuntimeException('Bahram status callback failed for lead #'.$this->leadId);
        }
    }
}
