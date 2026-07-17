<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\CourseAccessStatus;
use App\Enums\SatApplicationStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\SatApplication;
use App\Models\SeminarAttendee;
use App\Modules\TelegramBot\Models\TelegramAccount;

/**
 * Qualifying “subscription” for ticket/support gates:
 * active course access, paid order, accepted SAT, or seminar attendance.
 */
class TelegramSubscriberEligibility
{
    public function hasQualifyingAccess(TelegramAccount $account): bool
    {
        $userId = $account->user_id;
        if ($userId === null) {
            return false;
        }

        if (CourseAccess::query()
            ->where('user_id', $userId)
            ->where('status', CourseAccessStatus::Active)
            ->exists()) {
            return true;
        }

        if (Order::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->exists()) {
            return true;
        }

        if (SatApplication::query()
            ->where('user_id', $userId)
            ->where('status', SatApplicationStatus::Accepted)
            ->exists()) {
            return true;
        }

        return SeminarAttendee::query()
            ->where('user_id', $userId)
            ->exists();
    }

    public function denialMessage(): string
    {
        return '⛔ برای این بخش باید حداقل یک اشتراک فعال داشته باشید '
            .'(دوره کمپین، سمینار، یا سات پذیرفته‌شده).';
    }
}
