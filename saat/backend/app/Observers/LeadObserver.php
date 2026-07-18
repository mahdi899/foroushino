<?php

namespace App\Observers;

use App\Jobs\Integrations\ReportLeadStatusToBahramJob;
use App\Models\Lead;

/**
 * Reports lead status changes back to Bahram (Server 1) for leads that
 * originated there — queued so the calling request never waits on an
 * outbound HTTP round-trip.
 */
class LeadObserver
{
    public function updated(Lead $lead): void
    {
        if ($lead->bahram_application_id === null) {
            return;
        }

        if (! $lead->wasChanged('status')) {
            return;
        }

        ReportLeadStatusToBahramJob::dispatch($lead->id, $lead->status?->value ?? (string) $lead->status);
    }
}
