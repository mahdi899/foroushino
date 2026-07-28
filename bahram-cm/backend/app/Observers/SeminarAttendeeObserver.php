<?php

namespace App\Observers;

use App\Models\SeminarAttendee;
use App\Services\ContentPublishService;
use App\Services\TelegramHostCatalogRevision;

/**
 * Registering/removing an attendee changes the cached `remaining_seats` /
 * `attendees_count` / `is_full` figures shown on the public seminar detail
 * and promo endpoints — purge them alongside the Seminar-level observer.
 * Also refresh host catalog so capacity_hint stays accurate.
 */
class SeminarAttendeeObserver
{
    public function __construct(private readonly ContentPublishService $publish) {}

    public function saved(SeminarAttendee $attendee): void
    {
        $this->forget($attendee);
        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }

    public function deleted(SeminarAttendee $attendee): void
    {
        $this->forget($attendee);
        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }

    private function forget(SeminarAttendee $attendee): void
    {
        $slug = $attendee->seminar?->slug ?? $attendee->seminar()->value('slug');

        if ($slug) {
            $this->publish->revalidateSeminars($slug);
        }
    }
}
