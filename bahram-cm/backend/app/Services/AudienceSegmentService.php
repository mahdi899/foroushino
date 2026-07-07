<?php

namespace App\Services;

use App\Enums\ReferralConversionStatus;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Resolves named audience segments (used by the SMS center and admin
 * notification composer) into a collection of students.
 */
class AudienceSegmentService
{
    public const SEGMENTS = [
        'all_students' => 'همه دانشجویان',
        'course_buyers' => 'خریداران دوره',
        'seminar_attendees' => 'شرکت‌کنندگان سمینار',
        'incomplete_profiles' => 'پروفایل ناقص',
        'sat_submitted' => 'ثبت‌کننده سات',
        'sat_not_submitted' => 'بدون ثبت سات',
        'successful_referrers' => 'معرف‌های موفق',
    ];

    /** @return Collection<int, User> */
    public function resolve(string $segment): Collection
    {
        $query = User::query()->where('is_admin', false)->whereNotNull('mobile');

        $query = match ($segment) {
            'course_buyers' => $query->whereHas('courseAccesses'),
            'seminar_attendees' => $query->whereHas('seminarAttendances'),
            'incomplete_profiles' => $query->whereDoesntHave('profile'),
            'sat_submitted' => $query->whereHas('satApplications'),
            'sat_not_submitted' => $query->whereDoesntHave('satApplications'),
            'successful_referrers' => $query->whereHas(
                'referralConversionsAsReferrer',
                fn ($q) => $q->where('status', ReferralConversionStatus::Approved)
            ),
            default => $query,
        };

        return $query->get();
    }
}
